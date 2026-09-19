app.controller('divisionController', function ($scope, $routeParams, $location, dataFactory, scheduleFactory, statFactory, authFactory) {

    Utilities.log("Loading divisionController...");

    // Initialize variables
    $scope.controllerName = "divisionController" // for batarang debugging
    $scope.itemsPerPage = 20;
    $scope.currentPage = 1;
    $scope.maxPages = 8;
    $scope.tabSelected = "Teams";
    $scope.sortKey = "avg";
    $scope.loadingData = false;

    // Better to use scope specific to controller - gradually transition
    $scope.division = {}

    // Link to season-dependent constants
    $scope.season = dataFactory.season;
    season = dataFactory.season;

    // Division History loaded from external html file
    $scope.history = {}
    $scope.history.html = "<H1>Placeholder HTML</H1>";

    // To be loaded
    $scope.gameCount = undefined;
    $scope.games = null;
    $scope.standings = null;
    $scope.years = null;
    $scope.teams = null;
    $scope.cumulativeBattingStats = null;
    $scope.cumulativePitchingStats = null;
    $scope.teamBattingStats = null;
    $scope.teamPitchingStats = null;
    $scope.stats = {};
    $scope.stats.qualified = false;
    $scope.stats.includePlayoffs = false;

    // Some constants for qualifying
    var pitching_qualifier_mult = 1.5;
    var batting_qualifier_mult = 2.25;

    // Trying to migrate schedule displays to schedule controller
    $scope.schedule = scheduleFactory.schedule;

    // Check for valid parameters passed in.
    // If any are invalid, show a warning and go to defaults - TODO
    $scope.invalidParams = false;
    $scope.originalParams = $routeParams.year + ", " + $routeParams.divisionName;
    $scope.divisionName = ValidateDivisionName($routeParams.divisionName);
    $scope.divisionYear = ValidateYear($routeParams.year);

    // Load data - Static data that should only need to be loaded once.
    scheduleFactory.getGameCount($scope, { division: $scope.divisionName, year: $scope.divisionYear });
    scheduleFactory.getYears($scope, $scope.divisionName);
    dataFactory.loadTeamNames($scope, $scope.divisionYear);
    dataFactory.getDivisionTeams($scope, $scope.divisionYear, $scope.divisionName);

    // If season has started, set default tab to Standings (with Special case for 2020 late start)
    var today = new Date();
    if (today.getMonth() > 4) {
        $scope.activeTabIndex = 2   // Standings
    }

    $scope.pageChanged = function (page) {
        Utilities.log("Calling division:pageChanged");
        $scope.currentPage = page;
        if ($scope.tabSelected == "Schedule") GetGames();
    }

    $scope.division.showTab = function (tabName) {
        if (tabName == "Schedule") GetGames();
        if (tabName == "Standings") GetStandings();
        if (tabName == "Taxi") GetTaxiRequests();
        if (tabName == "OtherSeasons") GetHistory();
        $scope.tabSelected = tabName;
    }

    $scope.division.requestingTeams = function (game) {
        teamList = "";
        if (game.homeTaxi > 0) teamList += " " + game.homeShort;
        if (game.awayTaxi > 0) teamList += " " + game.awayShort;
        return teamList;
    }

    
    $scope.division.showTaxi = function (game) {
        game.showTaxi = !game.showTaxi
        if (!game.taxi) {
            game.taxi = {};
            authFactory.getTaxiDetails(game, game.gameId, "game");
        }
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
        else if (tabName == "DivisionBatting") {
            GetDivisionBattingStats();
        }
        else if (tabName == "DivisionPitching") {
            GetDivisionPitchingStats();
        }
        $scope.statsSelected = tabName;
    }

    $scope.closeAlert = function () {
        Utilities.log("Calling closeAlert ...");
        $scope.invalidParams = false;
    }

    $scope.navigateUp = function() {
        Utilities.log("navigateUp called from " + $location.path() + ", going to league/" + $scope.divisionYear);
        $location.path("league/" + $scope.divisionYear);
    }

    $scope.setPerPage = function (value) {
        $scope.itemsPerPage = value;
        $scope.currentPage = 1;
        if ($scope.tabSelected == "Schedule") GetGames();
        if ($scope.itemsPerPage < 0) {
            if ($scope.tabSelected == "Schedule") $scope.itemsPerPage = $scope.gameCount;
            if ($scope.tabSelected == "Stats" && $scope.statsSelected == "DivisionBatting") $scope.itemsPerPage = $scope.cumulativeBattingStats.length;
            if ($scope.tabSelected == "Stats" && $scope.statsSelected == "DivisionPitching") $scope.itemsPerPage = $scope.cumulativePitchingStats.length;
            // -- Not sure if these deletions are final --
            // if ($scope.tabSelected == "Trades") $scope.itemsPerPage = $scope.completedTrades.length;
            // if ($scope.tradesSelected == "ActiveTrades") $scope.itemsPerPage = $scope.activeTrades.length;
            // if ($scope.tradesSelected == "CompletedTrades") $scope.itemsPerPage = $scope.completedTrades.length;
        }
    }

    $scope.filterFunction = function (element) {
        return element.name.match(/^Ma/) ? true : false;
    }

    $scope.inRange = function (index, currentPage, statLine) {
        if (Number(index) < Number(currentPage - 1) * Number($scope.itemsPerPage)) return false;
        if (Number(index) >= Number(currentPage) * Number($scope.itemsPerPage)) return false;
        // Add check for qualified players
        if ($scope.stats.qualified && $scope.statsSelected == "DivisionBatting" && statLine.pa < statLine.teamGames * batting_qualifier_mult) return false;
        if ($scope.stats.qualified && $scope.statsSelected == "DivisionPitching" && statLine.ip < statLine.teamGames * pitching_qualifier_mult) return false;
        return true;
    }

    $scope.isSortColumn = function (key) {
        if (key == $scope.sortKey) return "sorted-col";
    }

    $scope.sortBatting = function (sortProperty) {
        statFactory.sortBattingStats($scope.cumulativeBattingStats, sortProperty);
        $scope.sortKey = sortProperty;
    }

    $scope.sortPitching = function (sortProperty) {
        statFactory.sortPitchingStats($scope.cumulativePitchingStats, sortProperty);
        $scope.sortKey = sortProperty;
    }

    $scope.sortTeamBatting = function (sortProperty) {
        statFactory.sortBattingStats($scope.teamBattingStats, sortProperty);
    }

    $scope.sortTeamPitching = function (sortProperty) {
        statFactory.sortPitchingStats($scope.teamPitchingStats, sortProperty);
    }

    $scope.getShortPlayerName = function (statLine) {
        return statLine.firstName.substring(0, 1) + ". " + statLine.lastName;
    }

    $scope.teamLinkName = function (teamName) {
        return Utilities.replaceAll(" ", "-", teamName);
    }

    $scope.getStreak = function (record) {
        var sequence = record.sequence;
        if (sequence.length == 0) {
            return "--";
        } else {
            var kind = sequence.charAt(sequence.length - 1);
            var count = 1;
            for (var prev = sequence.length - 2; prev >= 0; prev--) {
                if (sequence.charAt(prev) != kind) break;
                count++;
            }
            return kind + count;
        }
    }

    $scope.getLastTen = function (record) {
        var wins = 0;
        var losses = 0;
        var ties = 0;
        var sequence = record.sequence;
        for (var pos = sequence.length - 1; pos >= 0; pos--) {
            var outcome = sequence.charAt(pos);
            if (outcome == "W") wins++;
            if (outcome == "L") losses++;
            if (outcome == "T") ties++;
            if (pos == sequence.length - 10) break;
        }
        if (ties == 0) return wins + "-" + losses;
        return wins + "-" + losses + "-" + ties;
    }

    $scope.isPlayoff = function (game) {
        return (game && game.playoffRound && (Number(game.playoffRound) > 0)) ? "playoff-game" : "";
    }

    $scope.updateStandings = function () {
        GetStandings();
    }

    // Local Functions

    function GetGames() {
        scheduleFactory.getGames($scope, {
            year: $scope.divisionYear,
            scheduleType: "division",
            division: $scope.divisionName,
            page: ($scope.currentPage - 1),
            perPage: $scope.itemsPerPage
        });
    }

    function GetTaxiRequests() {
        scheduleFactory.getTaxiGames($scope.division, $scope.divisionYear, $scope.divisionName)
    }

    function GetStandings() {
        scheduleFactory.getStandings($scope, $scope.divisionYear, $scope.divisionName, $scope.stats.includePlayoffs);
    }

    function GetTeamBattingStats() {
        $scope.cumulativeBattingStats = null;
        statFactory.getCumulativeBatting($scope, { year: $scope.divisionYear, division: $scope.divisionName, group: "teams" });
    }

    function GetTeamPitchingStats() {
        $scope.cumulativePitchingStats = null;
        statFactory.getCumulativePitching($scope, { year: $scope.divisionYear, division: $scope.divisionName, group: "teams" });
    }

    function GetDivisionBattingStats() {    // (callingScope, statType, gameId, teamId, divisionId)
        $scope.cumulativeBattingStats = null;
        statFactory.getCumulativeBatting($scope, {year: $scope.divisionYear, division: $scope.divisionName});
        $scope.itemsPerPage = 20;
        $scope.currentPage = 1;
        $scope.maxPages = 8;
    }

    function GetDivisionPitchingStats() {
        $scope.cumulativePitchingStats = null;
        statFactory.getCumulativePitching($scope, { year: $scope.divisionYear, division: $scope.divisionName });
        $scope.itemsPerPage = 20;
        $scope.currentPage = 1;
        $scope.maxPages = 8;
    }

    function GetHistory() {
        dataFactory.getHistoryHtml($scope.history, $scope.divisionName);
    }

    // temp hard coding ... will load list of valid data to check against
    function ValidateDivisionName(divisionName) {
        return divisionName;
    }

    function ValidateYear(year) {
        if (year < season.firstYear || year > season.currentYear) {
            year = season.currentYear;
            $scope.invalidParams = true;
        }
        return year;
    }

    // function to format information regarding taxi requests, needed by "Taxi Requests" tab
    // This is a copy of the function from game-controller.js and should be moved to a single,
    // central location, probably in authFactory
    function FormatTaxiInfo(taxiObject) {

    }

    //  *****   *****   *****   *****   *****   *****   *****   *****   *****
    //  *****  TRADE CONTROLLER CODE - CLEAN UP AFTERWARDS  *****
    //  *****   *****   *****   *****   *****   *****   *****   *****   *****

    $scope.trade = {};
    $scope.activeTrades = [];
    $scope.completedTrades = [];
    $scope.isDivisionGMBool = 0;
    $scope.isGMTeamId = 0;
    $scope.isGMTeamName;
    $scope.addingTrade = false;

    //  Frontend Functions
    $scope.isTeamGM = function (teamName) {
        for (var i = 0; i < $scope.teams.length; i++) {
            if ($scope.teams[i].teamName == teamName) {
                if(authFactory.hasPermission('team', $scope.teams[i].teamId, "Manager")) {
                    isGMTeamId = $scope.teams[i].teamId;
                    return true;
                }
                else {
                    return false;
                }
            }
        }
    }

    $scope.isDivisionGM = function () {
        for (var i = 0; i < $scope.teams.length; i++) {
            if ($scope.teams[i].GM == authFactory.login.userName) {
                $scope.isGMTeamId = $scope.teams[i].teamId;
                $scope.isGMTeamName = $scope.teams[i].teamName;
                $scope.isDivisionGMBool = 1;
                return true;
            }
        }
    }

    //  Placeholder fucntion if we want to limit Trade tab to commissioners in that division only.
    $scope.isApprover= function (approverId) {
        if (approverId == authFactory.login.userId ) {
            return true;
        }
        else {
            return false;
        }
    }

    $scope.isGM = function () {
        return authFactory.isGM($scope);
    }

    $scope.division.isAdmin = function () {
        return authFactory.login.isAdmin;
    }

    $scope.division.isCommissioner = function () {
        var divisionId = null;
        if ($scope.teams && $scope.teams.length > 0) {
            divisionId = $scope.teams[0].divisionId;
        }
        return authFactory.hasPermission("division", divisionId, "Manager");
    }

    $scope.showTradesTab = function (tabName) {
        if (tabName == "ActiveTrades") GetActiveTrades($scope.divisionName);
        if (tabName == "CompletedTrades") GetCompletedTrades($scope.divisionName);
        $scope.tradesSelected = tabName;
    }

    //  GET Data Functions

    function GetActiveTrades(division) {
        authFactory.getActiveTrades($scope, division);
    }

    function GetCompletedTrades(division) {
        authFactory.getCompletedTrades($scope, division);
    }

    //  Data Manipulation Functions - Backend

    $scope.addTrade = function () {
        $scope.newTrade = {};
        $scope.addingTrade = true;
        $scope.newTrade.division = $scope.division;
        if ($scope.isDivisionGMBool == 1) {
            $scope.newTrade.team1 = $scope.isGMTeamId;
        }
    }

    $scope.saveTrade = function () {
        var newTrade = $scope.newTrade;
        $scope.addingTrade = false;

        //  Set Division Id
        newTrade.division = $scope.teams[0].divisionId;
        // Get values for Email
        newTrade.divisionName = $scope.divisionName;
        for (var i = 0; i < $scope.teams.length; i++) {
            if ($scope.teams[i].teamId == newTrade.team1) {
                newTrade.team1Name = $scope.teams[i].teamName;
            }
        }
        for (var i = 0; i < $scope.teams.length; i++) {
            if ($scope.teams[i].teamId == newTrade.team2) {
                newTrade.team2Name = $scope.teams[i].teamName;
            }
        }
        authFactory.saveTrade($scope, newTrade);
        $scope.newTrade = {};
        GetActiveTrades($scope.divisionName);
    }

    $scope.cancelTrade = function () {
        $scope.newTrade = {};
        $scope.addingTrade = false;
    }

    $scope.setGM = function (teamId) {
        var searchTeam = null;
        if (teamId == 1) {
            searchTeam = $scope.newTrade.team1;
        } else {
            searchTeam = $scope.newTrade.team2;
        }
        Utilities.log(searchTeam);
        for (var i = 0; i < $scope.teams.length; i++) {
            if ($scope.teams[i].teamId == searchTeam) {
                Utilities.log($scope.teams[i].GM);
                if (teamId == 1) {
                    $scope.newTrade.team1Approver = $scope.teams[i].GM;
                } else {
                    $scope.newTrade.team2Approver = $scope.teams[i].GM;
                }
            }
        }
    }
    $scope.processApproval = function (tradeId, btnId) {
        authFactory.approveTrade($scope, tradeId, btnId);
        GetActiveTrades($scope.divisionName);
    }
});