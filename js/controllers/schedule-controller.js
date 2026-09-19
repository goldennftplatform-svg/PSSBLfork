app.controller('scheduleController', function ($scope, dataFactory, commFactory, scheduleFactory) {

    // Since so many pages display schedule information in one form or another
    // that functionality is being consolidated into a separate controller.
    // There is also a custom directive in schedule-directive.js based on
    // the html template in templates/schedule-template.html

   Utilities.log("Loading scheduleController...");

    // THIS MAY BE UNNECESSARY
    $scope.controllerName = "scheduleController" // for batarang debugging
    $scope.controllerId = Math.floor((Math.random() * 10000) + 1); // for debugging
    $scope.objType = "$scope";

    // *** $scope variables that interact with view ***

    $scope.itemsPerPage = 20;
    $scope.currentPage = 1;
    $scope.maxPages = 8;
    $scope.mode = "Full";
    $scope.schedule = {};
    $scope.schedule.games = scheduleFactory.games;

    // *** Variables local to the controller ***

    var year = undefined;
    var division = undefined;
    var team = undefined;
    var playerId = undefined;
    var fieldId = undefined;
    var restrict = undefined;

    // *** $scope functions that interact with view ***

    $scope.setPerPage = function (value) {
       Utilities.log("Calling (schedule-controller) setPerPage ...");
        $scope.itemsPerPage = value;
        $scope.currentPage = 1;
       Utilities.log(">From setPerPage");
        GetGames();
        if ($scope.itemsPerPage < 0) {
            $scope.itemsPerPage = $scope.totalItems;
        }
        Utilities.log("Exiting (schedule-controller) setPerPage ...");
    }

    $scope.pageChanged = function (page) {
        $scope.currentPage = page;
       Utilities.log("Calling schedule:pageChanged ..." + $scope.currentPage);
        GetGames();
    }


    $scope.filterFunction = function (element) {
        return element.name.match(/^Ma/) ? true : false;
    };


    // *** Functions local to controller ***

    function GetGames() {
       Utilities.log("Calling GetGames");

        // If this is a multitab display, only do this if tab is selected
        if ($scope.tabSelected && ($scope.tabSelected != "Schedule")) return;

        // The query parameters will differ depending on where they came from
        params = GetAllParameters();

        dataFactory.getGames({ year: $scope.leagueYear, page: ($scope.currentPage - 1), perPage: $scope.itemsPerPage })
            .success(function (games) {
                $scope.games = games;
               Utilities.log("... GetGames Succeeded: retrieved " + games.length + " records");
                ProcessGames(games);
            })
            .error(function (error) {
                $scope.status = 'Unable to load game data: ' + error.message;
               Utilities.log("... GetGames Failed");
            });
    }

    function GetGameCount() {
       Utilities.log("Calling GetGameCount");

        // The query parameters will differ depending on where they came from
        GetAllParameters();

        dataFactory.getGameCount({ year: $scope.leagueYear })
            .success(function (count) {
                $scope.totalItems = count;
               Utilities.log("... GetGameCount Succeeded: returned " + count);
            })
            .error(function (error) {
                $scope.status = 'Unable to load game count: ' + error.message;
               Utilities.log("... GetGameCount Failed");
            });
    }

    function GetAllParameters() {
        //         dataFactory.getGames({ year: $scope.leagueYear, page: ($scope.currentPage - 1), perPage: $scope.itemsPerPage })

        returnParams = {};
        year = commFactory.getParameter('year');
        if (year) returnParams['year'] = year;

        page = commFactory.getParameter('page');
        if (page) returnParams['page'] = page;

        perPage = commFactory.getParameter('perPage');
        if (perPage) returnParams['perPage'] = perPage;

        division = commFactory.getParameter('division');
        if (division) returnParams['pdivisionage'] = division;

        team = commFactory.getParameter('team');
        if (team) returnParams['team'] = team;

        playerId = commFactory.getParameter('playerId');
        if (playerId) returnParams['playerId'] = playerId;

        fieldId = commFactory.getParameter('fieldId');
        if (fieldId) returnParams['fieldId'] = fieldId;

        restrict = commFactory.getParameter('restrict');
        if (restrict) returnParams['restrict'] = fieldId;

        return returnParams;
    }

    function DownloadSchedule(games, fileType) {
        var text = "Not implemented yet: coming soon";
        dataFactory.downloadAsFile(text, "draftlist." + fileType);
    }

});