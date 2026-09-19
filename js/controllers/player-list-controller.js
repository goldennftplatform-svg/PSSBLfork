app.controller('playerListController', function ($scope, $routeParams, $location, dataFactory, authFactory, statFactory, $http) {

    // !!!!!!!!!!! Warning - do not check in without extensive testing - breakage risk !!!!!!!!!!!!

    Utilities.log("Loading playerListController");
    $scope.controllerName = "playerListController" // for debugging
    $scope.controllerId = Math.floor((Math.random() * 10000) + 1); // for debugging
    $scope.objType = "$scope";

    var REFRESH_INTERVAL = 600000;    // server connection refresh interval in milliseconds

    $scope.callDebug = function () {
        // temp hook for setting breakpoint
        Utilities.log("...callDebug...");
    }

    // This receives json load file contents
    $scope.buffer = {};
    $scope.draft = {}; // Define as a precaution to prevent undefined property errors.
    $scope.freeAgent = {};
    $scope.freeAgentApplication = {};  // DELETE THIS IF ADMIN MENU IS MOVED
    $scope.freeAgentClaimed = {};
    $scope.freeAgentInfo = false;

    // Initialize variables - Player lists
    $scope.invalidParams = true;
    $scope.year = $routeParams.year;
    $scope.itemsPerPage = 20;
    $scope.currentPage = 1;
    $scope.maxPages = 8;
    $scope.playerCount = undefined;
    $scope.loadingData = false;

    // Link to season-dependent constants
    $scope.season = dataFactory.season;
    season = dataFactory.season;

    var playerListType = "Registered";
    if ($location.path().search("Taxi") >= 0) playerListType = "Taxi";
    if ($location.path().search("Draft") >= 0) playerListType = "Draft";
    if ($location.path().search("FreeAgents") >= 0) playerListType = "FreeAgent";
    if ($location.path().search("/draft/board") >= 0) playerListType = "DraftBoard";
    dataFactory.getPlayerCount($scope, $scope.year, playerListType)
    GetPlayers(playerListType);

    //  FREE AGENT PAGE
    if (playerListType == "FreeAgent") {
        dataFactory.getFreeAgentPlayers($scope, $scope.year, 0, -1, 1);
        dataFactory.getFreeAgentPlayers($scope.freeAgentApplication, $scope.year, 0, -1, 0);
        dataFactory.getFreeAgentPlayers($scope.freeAgentClaimed, $scope.year, 0, -1, 2);
        //  Trying the GetRoles Div Comm: discriminator = "division", mask = 4
        $scope.user = {};
        authFactory.getRoles($scope.user, authFactory.login.userId);
    }

    //AddSortNames($scope.players);
    if (playerListType == "Draft") {
        $scope.draft = dataFactory.draft;
        // Load all entries at once. We will filter and paginate afterward.
        if (!$scope.draft.draftPlayers || $scope.draft.draftPlayers.length < 1) {
            $scope.draft.filter = {};
            $scope.draft.year = $scope.year;
            $scope.draft.currentPage = 1;
            dataFactory.getDraftPlayers($scope.draft, $scope.year, 0, -1);
            // $scope.draft.itemsPerPage = $scope.draft.draftPlayers.length;
            $scope.draft.itemsPerPage = 200;
        } else {
            // Temp hack to reset year in case it is not current
            $scope.year = $scope.draft.year;
        }
        $scope.draft.canEditBibs = authFactory.hasPermission("competition", $scope.draft.year, "Administrator");


        $scope.draft.inRange = function () {
            //Compare the count of current items that passed the filter vs.
            // the range that should show in the pagination control
            if ($scope.itemsPerPage < 0) return true;
            var maxIndex = $scope.draft.currentPage * $scope.draft.itemsPerPage;
            var minIndex = maxIndex - $scope.draft.itemsPerPage;
            var testIndex = $scope.draft.filter.passCount;
            if (testIndex >= minIndex && testIndex < maxIndex) return true;
            return false;
        }

        $scope.draft.clearFilters = function () {
            $scope.draft.filter = {};
        }

        // Draft Pages need to persist on return, so these will be separate routines for now
        $scope.draft.setPerPage = function (value) {
            $scope.draft.itemsPerPage = value;
            $scope.draft.currentPage = 1;
            if ($scope.draft.itemsPerPage < 0) {
                $scope.draft.itemsPerPage = $scope.draft.draftPlayers.length;
            }
        }

        $scope.draft.pageChanged = function (page) {
            $scope.draft.currentPage = page;
        }

        $scope.draft.download = function () {
            var text = "Name,Age,Bib #,Positions,Experience,80% ?,Paid";
            for (var i = 0; i < $scope.draft.draftPlayers.length; i++) {
                var player = $scope.draft.draftPlayers[i];
                // {"firstName":"Hank","lastName":"Aaron","playerName":"Hank Aaron","birthDate":"1940-03-23","playerId":"5164","draftId":"958","bib":"","drafted":"0","commitment":"0","paid":"0","positions":"RF","experience":"pro"}
                if ($scope.draft.passesFilter(player)) {
                    text += "\n" + player.playerName;
                    text += "," + $scope.getPlayerAge(player.birthDate);
                    text += "," + player.bib;
                    text += ',"' + player.positions + '"';
                    text += "," + $scope.formatExperience(player.experience);
                    text += "," + ($scope.isTrue(player.commitment) ? "Yes" : "No");
                    text += "," + ($scope.isTrue(player.paid) ? "Yes" : "No");
                }
            }
            dataFactory.downloadAsFile(text, "draftlist.csv");
        }

        $scope.draft.saveBibs = function () {
            // Create a bib save list from the roster
            var playerList = $scope.draft.draftPlayers;
            var saveList = {};
            saveList.bibList = [];
            for (var index = 0; index < playerList.length; index++) {
                var player = playerList[index];
                var bibNumber = {};
                bibNumber.draftId = player.draftId;
                bibNumber.bib = player.bib;
                saveList.bibList.push(bibNumber);
            }
            authFactory.saveBibNumbers($scope.draft, saveList);
            $scope.draft.editingBibs = false;
        }

        $scope.draft.cancelBibEdit = function () {
            $scope.draft.editingBibs = false;
        }


        $scope.draft.parseDate = function (dateString) {
            var parsedDate = new Date(dateString);
            return parsedDate;
        }
    }


    if (playerListType == "DraftBoard") {
        // Any logged in user can view, but only affiliate admins can manage
        if (!authFactory.login.loggedIn) {
            $location.path("/message/not-logged-in");
        }
        $scope.draft = dataFactory.draft;
        $scope.draft.year = season.currentYear;
        $scope.draft.canManage = false;
        $scope.draft.filter = {};
        $scope.draft.timeout = null;
        if (authFactory.hasPermission("affiliate", authFactory.login.userId, "Administrator")) {
            $scope.draft.canManage = true;
        }

        // Load all entries at once. We will filter and paginate afterward.
        if (!$scope.draft.draftPlayers || $scope.draft.draftPlayers.length < 1) {
            $scope.draft.filter = {};
            dataFactory.getDraftPlayers($scope.draft, season.currentYear, 0, -1);
            InitDraftBoard();
        }
        // Put in a session keep alive every 10 minutes
        $scope.draft.ping = {};
        $scope.draft.keepAlive = setTimeout(RefreshConnect, REFRESH_INTERVAL);


        $scope.draft.startTimer = function () {
            $scope.draft.finishTime = Math.floor(new Date().getTime() / 1000);
            if ($scope.draft.timerPaused) {
                $scope.draft.finishTime += $scope.draft.remainingSeconds;
            } else {
                $scope.draft.finishTime += $scope.draft.division.timeLimit;
                $scope.draft.remainingSeconds = $scope.draft.division.timeLimit;
            }
            $scope.draft.timerRunning = true;
            $scope.draft.timerPaused = false;
            if ($scope.draft.timeout) clearTimeout($scope.draft.timeout);
            $scope.draft.timeout = setTimeout($scope.draft.updateTimer, 250);
        }

        $scope.draft.stopTimer = function () {
            if ($scope.draft.timeout) clearTimeout($scope.draft.timeout);
            $scope.draft.timerValue = "";
            $scope.draft.timerRunning = false;
        }

        $scope.draft.pauseTimer = function () {
            if ($scope.draft.timeout) clearTimeout($scope.draft.timeout);
            $scope.draft.timerRunning = false;
            $scope.draft.timerPaused = true;
        }

        $scope.draft.updateTimer = function () {
            var now = Math.floor(new Date().getTime() / 1000);
            $scope.draft.remainingSeconds = $scope.draft.finishTime - now;
            if ($scope.draft.remainingSeconds <= 0) {
                $scope.draft.remainingSeconds = 0;
                $scope.draft.timerRunning = false;
            } else {
                $scope.draft.timeout = setTimeout($scope.draft.updateTimer, 250);
            }
            UpdateCountdown();
            $scope.$apply();
        }

        $scope.draft.addToPool = function () {
            ModifyDraftPool(true);
        }

        $scope.draft.removeFromPool = function () {
            ModifyDraftPool(false);
        }

        $scope.draft.skipPick = function () {
            var division = $scope.draft.division;
            var round = division.rounds[division.currentRound];
            if (division.currentPick < round.length - 2) {
                var current = JSON.parse(angular.toJson(round[division.currentPick]));
                round[division.currentPick] = round[division.currentPick + 1];
                round[division.currentPick + 1] = current;
            }
            AdvanceDraft();
        }

        $scope.draft.selectPlayer = function (player) {
            // Don't process if we are at end of round
            var division = $scope.draft.division;
            if (division.currentPick > division.rounds[division.currentRound].length) return;
            // Disable for non-administrator
            if (!$scope.draft.canManage) return;

            var pick = division.rounds[division.currentRound][division.currentPick];
            pick.playerName = player.playerName;
            pick.playerId = player.playerId;
            pick.draftId = player.draftId;
            pick.bib = player.bib;
            RemovePlayerFromDraft(player);
            $scope.draft.update = {};
            // Send message to server to change status to "drafted". Not checking return for now.
            authFactory.changeDraftStatus($scope.draft.update, pick.draftId, true);
            NextPick();
        }

        $scope.draft.passPick = function () {
            var division = $scope.draft.division;
            var pick = division.rounds[division.currentRound][division.currentPick];
            pick.pass = true;
            NextPick();
        }

        $scope.draft.tradePick = function () {
            // Ignore if no specific team
            if ($scope.draft.tradeTo == "-1") return;
            var division = $scope.draft.division;
            var team = division.teams[$scope.draft.tradeTo];
            var pick = division.rounds[division.currentRound][division.currentPick];
            // Cannot trade to same team
            if (team.id == pick.teamId) return;
            pick.teamName = team.name + "(from " + pick.teamName + ")";
            pick.teamId = team.id;
            var trade = {};
            trade.round = division.currentRound;
            trade.pick = division.currentPick;
            trade.toTeamName = team.name;
            trade.toTeamId = team.id;
            division.tradeList.push(trade);
            $scope.draft.tradeTo = "-1";
            $scope.draft.startTimer();
        }

        $scope.draft.finishPicks = function () {
            var division = $scope.draft.division;
            var pick = division.rounds[division.currentRound][division.currentPick];
            pick.finished = true;
            NextPick();
        }

        $scope.draft.addExtraPick = function () {
            var division = $scope.draft.division;
            var team = division.teams[$scope.draft.addPick];
            var pick = {};
            pick.teamName = team.name;
            pick.teamId = team.id;
            pick.round = division.currentRound
            pick.pending = true;
            division.rounds[division.currentRound].push(pick);
            division.addPicks.push(pick);
            $scope.draft.addPick = -1;
        }

        $scope.draft.advanceRound = function () {
            $scope.draft.division.currentRound++;
            InitCurrentRound();
            $scope.draft.startTimer();
        }

        $scope.draft.divisionComplete = function () {
            var division = $scope.draft.division;
            if (!division || !division.status) return false;
            if (division.status && division.status == "Complete") return true;
            // Still in the middle of round?
            if (division.currentPick < division.rounds[division.currentRound].length) return false;
            // Check if any team is not "Finished"
            for (var i = 0; i < division.rounds[division.currentRound].length; i++) {
                var pick = division.rounds[division.currentRound][i];
                if (!pick.finished) return false;
            }
            division.status == "Complete";
            return true;
        }

        $scope.draft.recordResults = function () {
            // Build pick list
            var pickList = [];
            var division = $scope.draft.division;
            // Loop through list of rounds
            for (var i = 1; i < division.rounds.length; i++) {
                var round = division.rounds[i];
                for (var j = 0; j < round.length; j++) {
                    var nextPick = round[j];
                    // Only add if an actual pick was made
                    if (nextPick.draftId) {
                        var addPick = {};
                        addPick.poolId = nextPick.draftId;
                        addPick.teamId = nextPick.teamId;
                        pickList.push(addPick);
                    }
                }
            }
            // Do not go through added picks since they are already included above

            // Now send list to server
            $scope.draft.record = {};
            authFactory.reportDraftPicks($scope.draft.record, pickList);
        }

        $scope.draft.changeDivision = function (change) {
            var league = $scope.draft.league;
            league.divisionIndex += change;
            league.divisionIndex = (league.divisionIndex < 0) ? 0 : league.divisionIndex;
            league.divisionIndex = (league.divisionIndex < league.divisions.length - 1) ? league.divisionIndex : league.divisions.length - 1;
            LoadDivisionDraft(league.divisions[league.divisionIndex].name);
        }

        $scope.draft.undo = function (event) {
            // If the control key is held down, this indicates a complete reset.
            if (event.ctrlKey) {
                ResetDraft();
            } else {
                UndoLastDraftAction();
            }
            $scope.draft.undoImage = !$scope.draft.undoImage;
        }

        $scope.$watch('buffer.status', function (newValue, oldValue) {
            if (newValue && newValue != oldValue) {
                if ($scope.buffer.loadType == "league") {
                    $scope.draft.league = JSON.parse(angular.toJson($scope.buffer.data));
                    LoadDivisionDraft($scope.draft.league.divisions[$scope.draft.league.divisionIndex].name);
                } else if ($scope.buffer.loadType == "division") {
                    $scope.draft.division = JSON.parse(angular.toJson($scope.buffer.data));
                    $scope.draft.filter = {};
                    $scope.draft.filter.minAge = $scope.draft.division.minAge;
                    $scope.draft.filter.paid = true;
                    $scope.draft.filter.undrafted = true;
                    if ($scope.draft.sortProperty != "Bib") $scope.draft.sortBy("Bib");
                    InitCurrentRound();
                    /* Any players that need to be added
                    for (var i = 0; i < division.addPicks.length; i++) {
                        var newPick = division.addPicks[i];
                        division.rounds[division.currentRound].push(newPick);
                    }
                    // Any players that need to be removed
                    for (var i = 0; i < division.addPicks.length; i++) {
                        var newPick = division.addPicks[i];
                        division.rounds[division.currentRound].push(newPick);
                    }
                    */
                }
                $scope.buffer.status = false;
            }
        });

        $scope.$watch('draft.update.result', function (newValue, oldValue) {
            if (newValue && newValue != oldValue) {
                // Don't do anything yet ... may report errors
                $scope.draft.update.finished = true;
            }
        });
    }

    // =========== Common Functions for draft list and draft board ==========

    $scope.draft.passesFilter = function (player) {
        var filter = $scope.draft.filter;
        // Check for special cases where players are explicitly added or removed
        if (player.added) return true;
        if (player.removed) return false;

        if (!filter.firstPlayer) filter.firstPlayer = player;
        if (player == filter.firstPlayer) filter.passCount = 0;

        if (filter.minAge && $scope.getPlayerAge(player.birthDate) < filter.minAge) return false;
        if (filter.maxAge && $scope.getPlayerAge(player.birthDate) > filter.maxAge) return false;
        if (filter.positions && filter.positions.length > 0) {
            var match = false;
            for (var i = 0; i < filter.positions.length; i++) {
                var pos = filter.positions[i];
                // need to differentiate between C and CF
                if (pos == "C") {
                    var revised = player.positions.replace("CF", "XX");
                    if (revised.indexOf("C") >= 0) {
                        match = true;
                        break;
                    }
                } else if (player.positions.indexOf(pos) >= 0) {
                    match = true;
                    break;
                }
            }
            if (!match) return false;
        }
        if (filter.experience && filter.experience.length > 0) {
            var match = false;
            for (var i = 0; i < filter.experience.length; i++) {
                var experience = filter.experience[i];
                if (player.experience == experience) {
                    match = true;
                    break;
                }
            }
            if (!match) return false;
        }
        if (filter.commitment && (player.commitment == "0")) return false;
        if (filter.paid && (player.paid == "0")) return false;
        if (filter.undrafted && (player.drafted == "1")) return false;

        // Can only get here if all filters passed
        filter.passCount++;
        return true;
    }

    $scope.draft.sortBy = function (sortProperty) {
        var draft = $scope.draft;
        if (sortProperty == draft.sortProperty) {
            draft.sortDirection = -draft.sortDirection
        } else {
            draft.sortProperty = sortProperty;
            draft.sortDirection = 1;
        }
        // Go no farther if the player list is non-existent or empty
        if (!draft.draftPlayers || draft.draftPlayers.length == 0) return;

        if (sortProperty == "Name") {
            draft.draftPlayers.sort(function (a, b) {
                if ((b.lastName + " " + b.firstName) > (a.lastName + " " + a.firstName)) {
                    return -draft.sortDirection;
                } else {
                    return draft.sortDirection;
                }
            });
        } else if (sortProperty == "Age") {
            draft.draftPlayers.sort(function (a, b) {
                var aAge = $scope.getPlayerAge(a.birthDate);
                var bAge = $scope.getPlayerAge(b.birthDate);
                return (bAge > aAge) ? -draft.sortDirection : draft.sortDirection;
            });
        } else if (sortProperty == "Bib") {
            draft.draftPlayers.sort(function (a, b) {
                if (!a.bib) return draft.sortDirection;
                if (!b.bib) return -draft.sortDirection;
                return (parseInt(b.bib) > parseInt(a.bib)) ? -draft.sortDirection : draft.sortDirection;
            });
        } else if (sortProperty == "Registered") {
            draft.draftPlayers.sort(function (a, b) {
                if (!a.registered) return draft.sortDirection;
                if (!b.registered) return -draft.sortDirection;
                return (draft.parseDate(b.registered) > draft.parseDate(a.registered)) ? -draft.sortDirection : draft.sortDirection;
            });
        }
        draft.sortProperty = sortProperty;

        // Sorting messes up the ng-repeat sequence, so rebuild a fresh copy of the list
        var freshList = JSON.parse(angular.toJson(draft.draftPlayers));
        draft.filter.passCount = 0;
        draft.draftPlayers = freshList;
        draft.filter.firstPlayer = draft.draftPlayers[0];
    }

    // ========= End of Common Draft Functions ===========

    $scope.closeAlert = function () {
        Utilities.log("Calling closeAlert ...");
        $scope.invalidParams = false;
    }

    $scope.setPerPage = function (value) {
        Utilities.log("Calling setPerPage ...");
        $scope.itemsPerPage = value;
        $scope.currentPage = 1;
        GetPlayers(playerListType);
        if ($scope.itemsPerPage < 0) {
            $scope.itemsPerPage = $scope.playerCount;
        }
        Utilities.log("Exiting setPerPage ...");
    }

    $scope.pageChanged = function (page) {
        $scope.currentPage = page;
        Utilities.log("Calling pageChanged ..." + $scope.currentPage);
        GetPlayers(playerListType);
    }


    $scope.isActive = function (status) {
        return (status == 'Active');
    }

    $scope.isTrue = function (testValue) {
        return (testValue == 1);
    }

    $scope.draftStatus = function (status) {
        return (status == 1) ? "drafted" : "undrafted";
    }

    $scope.getPlayerAge = function (birthDate) {
        var dob = new Date(birthDate)
        var today = new Date();
        return today.getFullYear() - dob.getUTCFullYear();
    }

    $scope.formatPositions = function (bitString) {
        posList = "";
        if (bitString.charAt(0) == "1") posList += "P ";
        if (bitString.charAt(1) == "1") posList += "C ";
        if (bitString.charAt(2) == "1") posList += "1B ";
        if (bitString.charAt(3) == "1") posList += "2B ";
        if (bitString.charAt(4) == "1") posList += "3B ";
        if (bitString.charAt(5) == "1") posList += "SS ";
        if (bitString.charAt(6) == "1") posList += "LF ";
        if (bitString.charAt(7) == "1") posList += "CF ";
        if (bitString.charAt(8) == "1") posList += "RF ";
        return posList.trim();
    }

    $scope.formatExperience = function (experience) {
        switch (experience) {
            case 'none': return "None"; break;
            case 'll': return "Little League"; break;
            case 'ms': return "Middle School"; break;
            case 'hs': return "High School"; break;
            case 'adult': return "Adult League"; break;
            case 'college': return "College"; break;
            case 'pro': return "Pro"; break;
            default: return "Unknown"; break;
        }
    }
    
    $scope.formatDeadline = function(date) {
        var deadline = new Date(date);
        deadline.setDate(deadline.getDate() + 4);
        return deadline.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true });
    }

    // Local Functions

    function GetPlayers(playerListType) {
        switch (playerListType) {
            case "Registered":
                dataFactory.getRegisteredPlayers($scope, $scope.year, $scope.currentPage - 1, $scope.itemsPerPage);
                break;
            case "Taxi":
                dataFactory.getTaxiPlayers($scope, $scope.year, $scope.currentPage - 1, $scope.itemsPerPage);
                break;
            case "Draft":
                // Using separate load process now
                //dataFactory.getDraftPlayers($scope, $scope.year, $scope.currentPage - 1, $scope.itemsPerPage)
                break;
        }
    }

    //***** Internal draft board functions *****

    function InitDraftBoard() {
        $scope.draft.league = {};
        LoadLeagueDraft();
    }

    function InitCurrentRound() {
        // If there has been no initialization
        // We need to set up the round from scratch
        var division = $scope.draft.division;
        if (!division.rounds || !division.rounds[division.currentRound] || division.rounds[division.currentRound].length == 0) {
            // First we set up the baseline order
            division.rounds[division.currentRound] = [];
            for (var i = 0; i < division.teams.length; i++) {
                var team = division.teams[i];
                var pick = {};
                pick.teamName = team.name;
                pick.teamId = team.id;
                pick.pending = true;
                division.rounds[division.currentRound].push(pick);
            }
            // Now we add any trades
            for (var i = 0; i < division.tradeList.length; i++) {
                var trade = division.tradeList[i];
                if (trade.round == division.currentRound) {
                    var pick = division.rounds[division.currentRound][trade.pick];
                    pick.teamName = trade.toTeamName + "(from " + pick.teamName + ")";
                    pick.teamId = trade.toTeamId;
                }
            }
            // Are there any additional picks
            for (var i = 0; i < division.addPicks.length; i++) {
                var newPick = division.addPicks[i];
                if (newPick.round == division.currentRound) {
                    division.rounds[division.currentRound].push(newPick);
                }
            }
        }
        // Propagate finished status from previous round
        if (division.currentRound > 1) {
            for (var i = 0; i < division.teams.length; i++) {
                if (division.rounds[division.currentRound - 1][i].finished) {
                    division.rounds[division.currentRound][i].finished = true;
                }
            }
        }
        division.currentPick = 0;
        // Check if next team(s) up has finished draft
        SkipFinished();
        while (division.rounds[division.currentRound][division.currentPick].finished) division.currentPick++;
        $scope.draft.tradeTo = "-1";
        $scope.draft.addPick = "-1";
    }

    function NextPick() {
        var division = $scope.draft.division;
        //var round = division.rounds[division.currentRound]
        division.currentPick++;
        // Check if next team(s) up has finished draft
        SkipFinished();
        AdvanceDraft();
    }

    function SkipFinished() {
        var division = $scope.draft.division;
        while (division.currentPick < division.rounds[division.currentRound].length && division.rounds[division.currentRound][division.currentPick].finished) division.currentPick++;
    }

    function AdvanceDraft() {
        $scope.draft.startTimer();
        $scope.draft.tradeTo = "-1";
        $scope.draft.addPick = "-1";
        // Save copy of current state
        SaveDivisionDraft($scope.draft.division.name);
   }

    function ResetDraft() {
        if (confirm("Are you sure you want to clear all draft actions for this division?")) {
            // Hijack this temporarilly as a means to reload the current draft status from the server.
            LoadDivisionDraft($scope.draft.league.divisions[$scope.draft.league.divisionIndex].name + "_Current");
        } else {
            alert("Cancelling");
        }
        $scope.draft.league.divisions[$scope.draft.league.divisionIndex].name    }

    function UndoLastDraftAction() {

    }

    function UpdateCountdown() {
        var minutes = Math.floor($scope.draft.remainingSeconds / 60);
        var seconds = $scope.draft.remainingSeconds - 60 * minutes;
        var timerValue = minutes;
        timerValue += ":";
        if (seconds < 10) {
            timerValue += "0" + seconds;
        } else {
            timerValue += seconds;
        }
        $scope.draft.timerValue = timerValue;
    }

    function LoadLeagueDraft() {
        // Load league draft info
        // Should only happen on Init or refresh
        var filePath = "/data/draft/" + $scope.draft.year + "/league";
        $scope.buffer.loadType = "league";
        authFactory.loadJson($scope.buffer, filePath);
    }

    function SaveLeagueDraft() {
        // Save league draft info
        // Only do this when switching draft divisions, or on key status events.
        var filePath = "/data/draft/" + $scope.draft.year + "/league";
        authFactory.saveJson($scope.draft.league, $scope.draft.league, filePath);
    }

    function LoadDivisionDraft(divisionName) {
        // Load division draft info
        // Happens on Init, refresh or possibly on Undo
        var filePath = "/data/draft/" + $scope.draft.year + "/" + divisionName + "_Current";
        $scope.buffer.loadType = "division";
        $scope.buffer.status = null;
        authFactory.loadJson($scope.buffer, filePath);
        $scope.draft.stopTimer();
    }

    function SaveDivisionDraft(divisionName) {
        // Save league draft info
        // Save on every action that changes contents
        var UNDO_LEVELS = 5 //  (5 levels of undo)
        var filePath = "/data/draft/" + $scope.draft.year + "/" + divisionName;
        authFactory.saveJson($scope.draft.division, $scope.draft.division, filePath + "_Current");
        // Save extra copy for undo purposes
        var undoVersion = $scope.draft.division.version % (UNDO_LEVELS + 1);
        authFactory.saveJson($scope.draft.division, $scope.draft.division, filePath + "_Undo" + undoVersion);
        $scope.draft.division.version++;
    }

    function RemovePlayerFromDraft(player) {
        player.drafted = true;
        player.added = false;
        // Also write drafted property to database
    }

    function ModifyDraftPool(add) {
        var players = $scope.draft.draftPlayers;
        var modifyId = $scope.draft.tryoutId;
        $scope.draft.tryoutId = undefined;
        for (var index in players) {
            var player = players[index];
            if (player.draftId == modifyId) {
                player.added = add;
                player.removed = !add;
                return;
            }
        }
    }

    function UndoDivisionDraft(divisionName) {
        //TBD
    }

    // Normally handled by authController, but doesn't seem effective when using draft tool, so repeated here
    function RefreshConnect() {
        // Send a keep alive to the server in regular interval
        if (authFactory.login.loggedIn) {
            Utilities.log("Keep alive sent to server");
            authFactory.keepAlive($scope.draft.ping);
            $scope.draft.keepAlive = setTimeout(RefreshConnect, REFRESH_INTERVAL);
        } else {
            // If not logged in, terminate the loop
            clearTimeout($scope.draft.keepAlive);
        }
    }

// ================== FREE AGENT LISTING AND TOOL

    // $scope.freeAgent.admin = authFactory.hasPermission("competition", season.currentYear, "Administrator");

    $scope.isAdmin = function () {
        return authFactory.login.isAdmin;
    }
    $scope.isDivisionCommissioner = function () {
        for (var i = 0; i < $scope.user.roles.length; i++) {
            // console.log($scope.user.roles[i].discriminator);
            if ($scope.user.roles[i].discriminator == "division") {
                return true;   
            }
        }
    }

    // function loadFreeAgentApplications() {
    //     //  Get Free Agents where Status == 0
    //     Utilities.log("Loading free agent applications data ...");
    //     $scope.freeAgentApplicationsTemp = {};
    //     $http.get('data/freeagent.json')
    //     .then(function successCallback(response) {
    //         $scope.freeAgentApplicationsTemp = response.data;
    //         Utilities.log("free agent applications loaded");
    //     }, function errorCallback(response) {
    //         dataFactory.reportError("loadFreeAgentApplications", response);
    //     });
    //     for (var i = 0; i < $scope.freeAgentApplicationsTemp.length; i++){
    //         if($scope.freeAgentApplicationsTemp.status == 0) {
    //             $scope.freeAgentApplications.push($scope.freeAgentApplicationsTemp[i]);
    //             Utilities.log($scope.freeAgentApplicationsTemp[i]);
    //         }
    //     }
    // }


});