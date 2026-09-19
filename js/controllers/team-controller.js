app.controller('teamController', function ($scope, $routeParams, $location, dataFactory, scheduleFactory, statFactory, authFactory) {

   Utilities.log("Loading teamController...");
   Utilities.log("Utilities version: " + Utilities.version);

    // Initialize variables
    $scope.controllerName = "teamController" // for batarang debugging
    $scope.invalidParams = false;
    $scope.tabSelected = "Roster";
    $scope.mode = "Team";
    $scope.sortKey = "avg";
    $scope.loadingData = false;

    // Trying to migrate schedule displays to schedule controller
    $scope.schedule = scheduleFactory.schedule;

    // This controller will also be handling day league registration list,
    // so check if that is what we are here for.
    if ($location.path().search("/dayLeague") >= 0) {
        // If so, load the registration data for the daytime league
        LoadDaytimeRegistrations();
    } else {
        $scope.divisionName = ValidateDivisionName($routeParams.divisionName);
        $scope.teamName = ValidateTeamName(Utilities.replaceAll("-", " ", $routeParams.teamName));
        $scope.teamId = $routeParams.teamId;
        $scope.year = $routeParams.year;
    }

    // To be loaded
    $scope.franchise = null;
    $scope.gameCount = undefined;
    $scope.games = null;
    $scope.roster = null;
    $scope.cumulativeBattingStats = null;
    $scope.cumulativePitchingStats = null;
    $scope.cumulativeBattingTotals = null;
    $scope.cumulativePitchingTotals = null;

    $scope.stats = {};
    $scope.stats.qualified = false;

    // Some constants for qualifying
    var pitching_qualifier_mult = 1.5;
    var batting_qualifier_mult = 2.25;

    // For commissioner permissions, need more info to determine divisionId
    $scope.teamNames = {};
    dataFactory.loadTeamNames($scope.teamNames, $scope.year);

    $scope.showTab = function (tabName) {
       Utilities.log("Calling showTab for " + tabName);
        if (tabName === "Schedule") {
            GetGames();
        }
        else if (tabName === "Roster") {
            GetRoster();
        }
        else if (tabName === "RSVP") {
            // Need schedule, roster, and RSVPs
            InitRSVP();
        }
        else if (tabName === "OtherSeasons") {
            GetFranchise();
        }
        $scope.tabSelected = tabName;
    }

    // If schedule not posted, set default tab to Roster (with Special case for 2020 late start)
    var today = new Date();
    if (today.getMonth() > 4) {
        $scope.activeTabIndex = 0   // Schedule
    } else {
        $scope.activeTabIndex = 1   // Roster
    }

    $scope.showStatsTab = function (tabName) {
       Utilities.log("Calling showStatsTab for " + tabName);
        $scope.tabSelected = "Stats";
        if (tabName == "TeamBatting") {
            GetTeamBattingStats();
        }
        else if (tabName == "TeamPitching") {
            GetTeamPitchingStats();
        }
        $scope.statsSelected = tabName;
    }

    $scope.closeAlert = function () {
       Utilities.log("Calling closeAlert ...");
        $scope.invalidParams = false;
    }

    $scope.navigateUp = function () {
       Utilities.log("navigateUp called from " + $location.path() + ", going to " + "division/" + $scope.year);
        $location.path("division/" + $scope.divisionName + "/" +  $scope.year); // /division/Adirondack/2015
    }


    $scope.getPlayerAge = function (birthDate) {
        var dob = new Date(birthDate)
        var today = new Date();
        return today.getFullYear() - dob.getFullYear();
    }

    $scope.getShortPlayerName = function (statLine) {
        return statLine.firstName.substring(0,1) + ". " + statLine.lastName;
    }

    $scope.isActive = function (status) {
        return (status === 'Active');
    }

    $scope.isPlayoff = function (game) {
        return (game && game.playoffRound && (Number(game.playoffRound) > 0)) ? "playoff-game" : "";
    }

    $scope.teamLinkName = function (teamName) {
        return Utilities.replaceAll(" ", "-", teamName);
    }

    $scope.isQualified = function (statLine) {
        // Add check for qualified players
        if ($scope.stats.qualified && $scope.statsSelected == "TeamBatting" && statLine.pa < statLine.teamGames * batting_qualifier_mult) return false;
        if ($scope.stats.qualified && $scope.statsSelected == "TeamPitching" && statLine.ip < statLine.teamGames * pitching_qualifier_mult) return false;
        if ($scope.stats.noTaxi && statLine.taxi == "1") return false;
        return true;
    }

    $scope.isSortColumn = function (key) {
        if (key === $scope.sortKey) return "sorted-col";
    }

    $scope.sortBatting = function (sortProperty) {
        statFactory.sortBattingStats($scope.cumulativeBattingStats, sortProperty);
        $scope.sortKey = sortProperty;
    }

    $scope.sortPitching = function (sortProperty) {
        statFactory.sortPitchingStats($scope.cumulativePitchingStats, sortProperty);
        $scope.sortKey = sortProperty;
    }

    $scope.resultClass = function (game) {
        if (game.outcome === "W") return "game-result game-win";
        if (game.outcome === "L") return "game-result game-loss";
        return "game-result game-tie";
    }

    // Roster management hooks
    $scope.canManage = function () {
        return authFactory.hasPermission('team', $scope.teamId, "Manager");
    }

    $scope.canAdmin = function () {
        return authFactory.hasPermission('team', $scope.teamId, "Administrator");
    }

    $scope.manageRoster = function () {
        $location.path("admin/team/" + $scope.teamId); // /division/Adirondack/2015
    }

    $scope.isTrue = function (testValue) {
        return (testValue == 1);
    }

    // **** RSVP specific code and functions ****

    $scope.rsvp = {};

    $scope.rsvp.isTeamMember = function () {
        // check if team is on team list
        if (authFactory.login && authFactory.login.loggedIn) {
            for (var iTeam in authFactory.login.teams) {
                if (authFactory.login.teams[iTeam].team_id == $scope.teamId) return true;
            }
        }
        return false;
    }

    $scope.rsvp.playingIcon = function (player) {
        test = player.playingStatus;
        if (test === "Yes") return "success fa fa-check";
        if (test === "No") return "danger fa fa-times";
        if (test === "Maybe") return "";
        return "fa fa-question";
    }

    $scope.rsvp.playingLabel = function (player) {
        test = player.playingStatus;
        if (!test) return "";
        return test;
    }

    $scope.rsvp.SetMode = function (mode, game) {
        $scope.rsvp.confirm = undefined;
        $scope.rsvp.error = undefined;
        if (mode === "status") {
            $scope.rsvp.replyMode = true;
            SetReplyPlayer();
        } else {
            $scope.rsvp.replyMode = false;
            SetReplyGame(game);
        }
    }

    // Button class function - green Bootstrap button if selected, gray otherwise
    $scope.rsvp.buttonClass = function (game) {
        // if passed with a game object
        if (!game && $scope.rsvp.replyMode) return "btn btn-success";
        if (game && $scope.rsvp.game == game.gameId) return "btn btn-success";
        return "btn btn-secondary";
    }

    // Can edit replies if in edit mode and date is in the future
    $scope.rsvp.canEdit = function (game) {
        if (!$scope.rsvp.replyMode) return false;
        if (!$scope.rsvp.editing) return false;
        if (game.date < new Date()) return false;
        return true;
    }

    $scope.rsvp.SubmitEdits = function () {
        $scope.rsvp.editing = false;

        // Build up rsvp object to send
        var responseData = {};
        responseData.userId = parseInt(authFactory.login.userId);
        responseData.teamId = parseInt($scope.teamId);
        responseData.rsvpList = [];
        for (var gameIndex in $scope.games) {
            var game = $scope.games[gameIndex];
            if (game.playingStatus) {
                newItem = {}
                newItem.gameId = game.gameId;
                newItem.status = game.playingStatus;
                newItem.comment = game.comment;
                responseData.rsvpList.push(newItem);
            }
        }
        // Send the request. When it returns we are going to reload all team rsvp data
        authFactory.sendRSVP($scope.rsvp, responseData);
    }

    $scope.rsvp.CancelEdits = function () {
        $scope.rsvp.confirm = undefined;
        $scope.rsvp.error = undefined;
        $scope.rsvp.editing = false;
        SetReplyPlayer();
    }

    // When rsvp data returns, need to update game and roster lists
    $scope.$watch('rsvpLoaded', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            if ($scope.rsvpList[0].error) {
                if ($scope.rsvpList[0].error.includes("Not Logged In")) {
                    authFactory.logout($scope.login);
                    $location.path("/message/not-logged-in");
                }
            }
            SetReplyPlayer();
        }
    });

    $scope.$watch('rsvpSent', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            if ($scope.result.error) {
                if ($scope.result.error.includes("Not logged In")) {
                    $location.path("/message/not-logged-in");
                }
            }
            SetReplyPlayer();
        }
    });

    $scope.$watch('rosterLoaded', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            SetReplyPlayer();
        }
    });
    
    $scope.$watch('games', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            SetReplyPlayer();
        }
    });


    // Local Functions

    function LoadDaytimeRegistrations() {
        // Special case added to display daytime baseball signups
        $scope.dayPlayers = {};
        dataFactory.getDayPlayers($scope.dayPlayers);
    }
    
    function InitRSVP() {
        $scope.rsvp.schedClass = "col-md-12";
        $scope.rsvp.replyMode = true;
        $scope.rsvp.gameId = undefined;
        $scope.rsvp.statusStyle = "text-align:center;background-color:lightgreen";
        GetGames();
        GetRoster();
        GetRSVP();
    }

    function GetGames() {
        $scope.games = null;
        scheduleFactory.getGames($scope, {
            year: $scope.year,
            teamId: $scope.teamId,
            scheduleType: "team"
        });
    }

    function GetRoster() {
        $scope.rosterLoaded = false;
        dataFactory.getRoster($scope, $scope.teamId);
    }

    function GetRSVP() {
        $scope.rsvpLoaded = false;
        authFactory.getRSVP($scope, $scope.teamId, authFactory.login.userId);
    }

    function GetFranchise() {
        dataFactory.getFranchise($scope, $scope.teamId);
    }

    function GetTeamBattingStats() {
        statFactory.getCumulativeBatting($scope, { teamId: $scope.teamId });
    }

    function GetTeamPitchingStats() {
        statFactory.getCumulativePitching($scope, { teamId: $scope.teamId });
    }

    function SetReplyGame(game) {
        // Reset the roster data to match the currently selected game
        var gameId = game.gameId;

        // First null out any previous data
        for (var playerIndex in $scope.roster) {
            var player = $scope.roster[playerIndex];
            player.playingStatus = undefined;
            player.comment = null;
        }
        // Now go through the rsvp data and find any matching items
        for (var rsvpIndex in $scope.rsvpList) {
            var rsvpItem = $scope.rsvpList[rsvpIndex];
            // Gameid must match
            if (rsvpItem.gameId === gameId) {
                for (var playerIndex in $scope.roster) {
                    var currentPlayer = $scope.roster[playerIndex];
                    if (currentPlayer.rosterId == rsvpItem.rosterId) {
                        currentPlayer.playingStatus = rsvpItem.status;
                        currentPlayer.comment = rsvpItem.comment;
                    }
                }
            }

        }
        $scope.rsvp.game = gameId;
    }

    function SetReplyPlayer() {

        // Only do this if all required data has been loaded;
        // otherwise, it will be called again when ready
        if (!$scope.rsvpLoaded || !$scope.rosterLoaded || !$scope.games) return;

        var rosterId = undefined;
        for (var rosterIndex in $scope.roster) {
            var rosterItem = $scope.roster[rosterIndex];
            if (rosterItem.playerId == authFactory.login.userId) {
                rosterId = rosterItem.rosterId;
            }
        }

        // First null out any previous data
        for (var gameIndex in $scope.games) {
            var game = $scope.games[gameIndex];
            game.playingStatus = undefined;
            game.comment = null;
        }

        // Now go through the rsvp data and find any matching items
        for (var rsvpIndex in $scope.rsvpList) {
            var rsvpItem = $scope.rsvpList[rsvpIndex];
            // rosterId must match
            if (rsvpItem.rosterId == rosterId) {
                for (var gameIndex in $scope.games) {
                    var currentGame = $scope.games[gameIndex];
                    if (currentGame.gameId == rsvpItem.gameId) {
                        currentGame.playingStatus = rsvpItem.status;
                        currentGame.comment = rsvpItem.comment;
                    }
                }
            }
        }
        $scope.rsvp.game = undefined;
    }

    // temp hard coding ... will load list of valid data to check against
    function ValidateDivisionName(divisionName) {
        return divisionName;
    }

    function ValidateTeamName(teamName) {
        return teamName;
    }

});