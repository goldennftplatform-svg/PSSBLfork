app.controller('leagueController', function ($scope, $routeParams, dataFactory, scheduleFactory) {

   Utilities.log("Loading divisionController...");

    // Initialize variables
    $scope.controllerName = "leagueController" // for batarang debugging
    $scope.invalidParams = true;
    $scope.itemsPerPage = 20;
    //$scope.currentPage = 1;
    $scope.maxPages = 8;
    $scope.tabSelected = "Details";
    $scope.loadingData = false;

    // To be loaded
    $scope.gameCount = undefined;
    $scope.games = null;
    $scope.pastYears = null;
    $scope.divisions = null;

    // Link to season-dependent constants
    $scope.season = dataFactory.season;
    season = dataFactory.season;

    // Check for valid parameters passed in.
    // If any are invalid, show a warning and go to defaults - TODO
    $scope.invalidParams = false;
    $scope.originalParams = $routeParams.year;
    $scope.leagueYear = ValidateYear($routeParams.year);

    // Trying to migrate schedule displays to schedule controller
    $scope.schedule = scheduleFactory.schedule;

    // Initial data loads should only need to execute once, since this data is static.
    dataFactory.loadTeamNames($scope, $scope.leagueYear);
    scheduleFactory.getYears($scope);
    scheduleFactory.getGameCount($scope, { year: $scope.leagueYear });

    $scope.closeAlert = function () {
       Utilities.log("Calling closeAlert ...");
        $scope.invalidParams = false;
    }

    $scope.showTab = function (tabName) {
       Utilities.log("Calling showTab for " + tabName);
        $scope.tabSelected = tabName;
        if (tabName == "Schedule") GetGames();
        if (tabName == "Details") GetDivisions();
    }

    $scope.setPerPage = function (value) {
       Utilities.log("Calling league:setPerPage = " + value);
        $scope.itemsPerPage = value;
        $scope.currentPage = 1;
        GetGames();
        if ($scope.itemsPerPage < 0) {
            $scope.itemsPerPage = $scope.gameCount;
        }
    }

    $scope.pageChanged = function (page) {
        $scope.currentPage = page;
        Utilities.log("Calling league:pageChanged to " + $scope.currentPage);
        GetGames();
    }

    $scope.filterFunction = function (element) {
        return element.name.match(/^Ma/) ? true : false;
    };

    // Local Functions

    function GetDivisions() {
        if ($scope.tabSelected == "Details") dataFactory.getDivisions($scope, $scope.leagueYear);
    }

    function GetGames() {
       Utilities.log("Calling league:GetGames for " + $scope.currentPage);
        if ($scope.tabSelected == "Schedule") {
            scheduleFactory.getGames($scope, {
                year: $scope.leagueYear,
                scheduleType: "league",
                page: ($scope.currentPage - 1),
                perPage: $scope.itemsPerPage
            })
        }
    }

    function GetGameCount() {
        scheduleFactory.getGameCount($scope, { year: $scope.leagueYear });
    }

    // After retrieving games from the database, we are not quite done:
    //   We need to swap the field ID with the short name of the field.
    //   We need to show division names for all games (on this league display).
    //   We need to reformat the outcome
    // Need to consolodate multiple versions of this in different controllers
    // {"homeTeam":"Generals","homeDivision":"adirondack","visitor":"Bees","visitorDivision":"adirondack","date":"Jul 25th, 2015","time":"9:00 am","fieldId":"3","result":""}
    // ***OBSOLETE ***
    function ProcessGames(games) {
       Utilities.log("Calling ProcessGames");
        for (i = 0; i < games.length; i++) {
            games[i].fieldName = GetShortFieldName(games[i].fieldId);
            games[i].homeTeam = Utilities.capitalize(games[i].homeDivision) + " " + games[i].homeTeam;
            games[i].visitor = Utilities.capitalize(games[i].visitorDivision) + " " + games[i].visitor;
            games[i].status = "Unknown";  // TODO: Outcome        
        }

    }

    // ***OBSOLETE ***
    function GetShortFieldName(fieldId) {
        var key = "F" + fieldId;
        if (shortFieldNames) {
            return shortFieldNames[key];
        } else {
            return "Field " + fieldId;
        }
    }

    function ValidateYear(year) {
        if (year < season.firstYear || year > season.currentYear) {
            year = season.currentYear;
            $scope.invalidParams = true;
        }
        return year;
    }

});
