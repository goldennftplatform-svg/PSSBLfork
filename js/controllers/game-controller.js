app.controller('gameController', function ($scope, $routeParams, $route, dataFactory, statFactory, authFactory) {

    // TODO - it might be a good idea to show a loading screen until all of the data is loaded up.

    Utilities.log("Loading gameController...");

    // Initialize variables
    $scope.controllerName = "gameController" // for batarang debugging
    $scope.loadingData = false;

    // To be loaded
    $scope.gameInfo = null;
    $scope.scoreSummary = undefined;
    $scope.lineScore = null;
    $scope.homeBattingStats = null;
    $scope.awayBattingStats = null;
    $scope.homeCumulativeBattingStats = null;
    $scope.awayCumulativeBattingStats = null;
    $scope.homePitchingStats = null;
    $scope.awayPitchingStats = null;
    $scope.homeCumulativePitchingStats = null;
    $scope.awayCumulativePitchingStats = null;
    $scope.homeBoxScore = null;
    $scope.awayBoxScore = null;
    $scope.homePitchingSummary = null;
    $scope.awayPitchingSummary = null;

    $scope.callDebug = function () {
        // temp hook for setting breakpoint
        Utilities.log("...callDebug...");
    }

    // Check for valid parameters passed in.
    // If any are invalid, show a warning and go to defaults - TODO
    $scope.invalidParams = false;
    $scope.gameId = $routeParams.gameId;
    $scope.futureGame = false;

    // Initialize taxi pool variables
    $scope.taxi = {};
    $scope.taxi.inviteTeam = 0;
    $scope.taxi.modifyTeam = 0;
    $scope.taxi.inviteCount = 1;
    $scope.taxi.inviteCatcher = 0;
    $scope.taxi.inviteGear = 0;

    // Initialize permission to edit scores and stats
    $scope.canEditAway = false;
    $scope.canEditHome = false;
    $scope.defaultTeamId = null;

    // Load data - Static data that should only need to be loaded once.
    // As each result comes in, the display needs to be updated.
    // TODO: need to make sure team names are loaded.

    dataFactory.getGameInfo($scope, $scope.gameId);

    // Activate a watch function for when the gameinfo finishes loading
    $scope.$watch('gameInfo', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            FormatGameInfo();
            // We now have the information needed to load game stats for the
            // box score and line score. They will have to be processed once the
            // data is received.
            statFactory.getCumulativeBatting($scope, { statType:"Home", gameId:$scope.gameId, teamId:$scope.gameInfo.homeId }); 
            statFactory.getCumulativePitching($scope, { statType: "Home", gameId: $scope.gameId, teamId: $scope.gameInfo.homeId });
            statFactory.getCumulativeBatting($scope, { statType: "Away", gameId: $scope.gameId, teamId: $scope.gameInfo.awayId });
            statFactory.getCumulativePitching($scope, { statType: "Away", gameId: $scope.gameId, teamId: $scope.gameInfo.awayId });
            $scope.canEditAway = authFactory.hasPermission("team", $scope.gameInfo.awayId, "Statistician");
            $scope.canEditHome = authFactory.hasPermission("team", $scope.gameInfo.homeId, "Statistician");
            if ($scope.canEditAway) $scope.defaultTeamId = $scope.gameInfo.awayId;
            if ($scope.canEditHome) $scope.defaultTeamId = $scope.gameInfo.homeId;
            // Can also now collect information about taxi pool requests
            authFactory.getTaxiDetails($scope.taxi, $scope.gameId, "game");
        }
    });

    // When the cumulative stat database calls have completed, the game stats can then be requested
    $scope.$watch('homeCumulativeBattingStats', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            statFactory.getBattingStats($scope, "Home", $scope.gameId, $scope.gameInfo.homeId);
        }
    });

    $scope.$watch('homeCumulativePitchingStats', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            statFactory.getPitchingStats($scope, "Home", $scope.gameId, $scope.gameInfo.homeId);
        }
    });

    $scope.$watch('awayCumulativeBattingStats', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            statFactory.getBattingStats($scope, "Away", $scope.gameId, $scope.gameInfo.awayId);
        }
    });

    $scope.$watch('awayCumulativePitchingStats', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            statFactory.getPitchingStats($scope, "Away", $scope.gameId, $scope.gameInfo.awayId);
        }
    });

    // When both cumulative and game stats have been returned, the game display components can be compiled

    $scope.$watch('homeBattingStats', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            $scope.homeBoxScore = statFactory.compileBoxScore($scope.homeBattingStats, $scope.homeCumulativeBattingStats);
            // Update line score with hit totals - not sure what order this loads so check after boxscore and linescores load
            if ($scope.homeBoxScore && $scope.lineScore && ($scope.homeBoxScore.gameTotals.h != undefined)) {
                $scope.lineScore.homeHitTotal = $scope.homeBoxScore.gameTotals.h;
            }
        }
    });

    $scope.$watch('homePitchingStats', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            $scope.homePitchingSummary = statFactory.compilePitchingSummary($scope.homePitchingStats, $scope.homeCumulativePitchingStats);
        }
    });

    $scope.$watch('awayBattingStats', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            $scope.awayBoxScore = statFactory.compileBoxScore($scope.awayBattingStats, $scope.awayCumulativeBattingStats);
            // Update line score with hit totals - not sure what order this loads so check after boxscore and linescores load
            if ($scope.awayBoxScore && $scope.lineScore && ($scope.awayBoxScore.gameTotals.h != undefined)) {
                $scope.lineScore.awayHitTotal = $scope.awayBoxScore.gameTotals.h;
            }
        }
    });

    $scope.$watch('awayPitchingStats', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            $scope.awayPitchingSummary = statFactory.compilePitchingSummary($scope.awayPitchingStats, $scope.awayCumulativePitchingStats);
            // Last thing to fetch is the Line Score
            statFactory.getLineScore($scope, $scope.gameId)
        }
    });

    $scope.$watch('lineScore', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            // Fill in missing run totals if necessary
            if ($scope.lineScore.awayRunTotal == undefined) $scope.lineScore.awayRunTotal = $scope.gameInfo.awayRuns;
            if ($scope.lineScore.homeRunTotal == undefined) $scope.lineScore.homeRunTotal = $scope.gameInfo.homeRuns;

            // Update line score with hit totals - not sure what order this loads so check after boxscore and linescores load
            // Set to values reported in gameInfo, but override with totals if stats were entered
            $scope.lineScore.awayHitTotal = $scope.gameInfo.awayHits;
            $scope.lineScore.homeHitTotal = $scope.gameInfo.homeHits;
            if ($scope.homeBoxScore && $scope.homeBoxScore.gameTotals && ($scope.homeBoxScore.gameTotals.h != undefined)) {
                $scope.lineScore.homeHitTotal = $scope.homeBoxScore.gameTotals.h;
            }
            if ($scope.awayBoxScore && $scope.awayBoxScore.gameTotals && ($scope.awayBoxScore.gameTotals.h != undefined)) {
                $scope.lineScore.awayHitTotal = $scope.awayBoxScore.gameTotals.h;
            }
            // We will report errors as entered from the score entry
            $scope.lineScore.awayErrorTotal = $scope.gameInfo.awayErrors;
            $scope.lineScore.homeErrorTotal = $scope.gameInfo.homeErrors;
        }
    });

    $scope.$watch('taxi.details', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            // Format the information about taxi pool requests for this game
            FormatTaxiDetails();
        }
    });

    $scope.$watch('taxi.requestResult', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            // Either show an error message or reload the page
            // Error message has already been set by authFactory return
            if (!$scope.taxi.requestResult.error) {
                $route.reload();
            }
        }
    });

    $scope.$watch('taxi.cancelResult', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            // Either show an error message or reload the page
            // Transfer error message to display
            if (!$scope.taxi.cancelResult.error) {
                $route.reload();
            } else {
                $scope.taxi.error = "Cancel Request Failed. Error = " + $scope.taxi.cancelResult.error;
            }
        }
    });

    $scope.isSubstitute = function (battingOrder) {
        if (Number(battingOrder) != Math.floor(Number(battingOrder))) return "substitute-hitter";
    }

    // [{"homeId":"669","awayId":"671","homeRuns":"9","awayRuns":"11","year":"2015","dateTime":"2015-09-03 19:00:00","fieldId":"53","fieldName":"Russell Road Park","outcome":"finished","gameId":"6986","playoffRound":"0","result":"away_win"}]

    // ---------- Taxi Pool related functions ------------
    $scope.taxi.sendTaxiRequest = function (action, teamId, requestId) {
        var objRequest = BuildTaxiRequest(action, teamId, requestId);
        authFactory.sendTaxiRequest($scope.taxi, objRequest);
    }

    // Permissions to manage taxi requests restricted to team manager, division commissioner, or above
    $scope.taxi.canRequestTaxi = function (teamId) {
        return ($scope.futureGame &&
            (authFactory.hasPermission("team", teamId, "Manager") || authFactory.hasPermission("division", $scope.gameInfo.divisionId, "Manager")));
    }

    // However, no new request can be created if there is a previously created request
    $scope.taxi.previousRequest = function (teamId) {
        if ($scope.taxi.info && $scope.taxi.info[teamId] && $scope.taxi.info[teamId].requests && $scope.taxi.info[teamId].requests.length > 0) {
            return true;
        }
        return false;
    }


    $scope.taxi.canModifyTaxi = function (request) {
        return ($scope.futureGame &&
            (authFactory.hasPermission("team", request.teamId, "Manager") || authFactory.hasPermission("division", $scope.gameInfo.divisionId, "Manager")));
    }

    $scope.taxi.noChanges = function () {
        if ($scope.taxi.modifyCount != $scope.taxi.modifyRequest.players) return false;
        if ($scope.taxi.modifyCatcher != $scope.taxi.modifyRequest.catchers) return false;
        if ($scope.taxi.modifyGear != $scope.taxi.modifyRequest.gear) return false;
        return true;
    }

    $scope.taxi.startModify = function (request) {
        $scope.taxi.modifyCount = request.players;
        $scope.taxi.modifyCatcher = request.catchers;
        $scope.taxi.modifyGear = request.gear;
        $scope.taxi.modifyRequest = request;
    }

    $scope.taxi.canExpandTaxi = function (request) {
        // Must be at least 2 hours since original request
        if (request) {
            var testTime = new Date(request.requestTime);
            if (Date.now() - testTime.getTime() < 2 * 60 * 60 * 1000) return false; // getTime is in milliseconds
            //if (Date.now() - testTime.getTime() < 5 * 60 * 1000) return false; // getTime is in milliseconds
            return ($scope.futureGame && authFactory.hasPermission("team", request.teamId, "Manager"));
        }
        return false;
    }

    $scope.taxi.cancelTaxi = function (request) {
        authFactory.taxiCancel($scope.taxi, request.requestId, request.teamId);
    }

    // Game summary is built from values returned by call to dataFactory.GetGameInfo,
    // but various names have to be retrieved from cached queries via dataFactory functions.
    function FormatGameInfo() {
        var scoreLine = "?????";
        if ($scope.gameInfo) {
            var gameInfo = $scope.gameInfo;

            // No longer necessary - returned by query
            //dataFactory.loadTeamNames($scope, gameInfo.year);
            //gameInfo.homeDivision = dataFactory.getTeamDivision(gameInfo.homeId);
            //gameInfo.awayDivision = dataFactory.getTeamDivision(gameInfo.awayId);
            //gameInfo.homeName = dataFactory.getTeamName(gameInfo.homeId);
            //gameInfo.awayName = dataFactory.getTeamName(gameInfo.awayId);

            scoreLine = "";
            if (Number(gameInfo.awayRuns) > Number(gameInfo.homeRuns)) {
                scoreLine += gameInfo.awayDivision + " " + gameInfo.awayName + " " + gameInfo.awayRuns + ", ";
                if (gameInfo.homeDivision != gameInfo.awayDivision) scoreLine += gameInfo.homeDivision + " ";
                scoreLine += gameInfo.homeName + " " + gameInfo.homeRuns;
            } else {
                scoreLine += gameInfo.homeDivision + " " + gameInfo.homeName + " " +gameInfo.homeRuns + ", ";
                if (gameInfo.homeDivision != gameInfo.awayDivision) scoreLine += gameInfo.awayDivision + " ";
                scoreLine += gameInfo.awayName + " " + gameInfo.awayRuns;
            }

            // Try to fix the time variables
            gameInfo.dateTime = Date.parse(gameInfo.dateTime);
            if (gameInfo.postedDate) {
                gameInfo.postedDate = Date.parse(gameInfo.postedDate);
            }
            // Is this a future game
            var currentTime = new Date();
            if (currentTime < gameInfo.dateTime) {
                $scope.futureGame = true;
            }
        }
        $scope.scoreSummary = scoreLine;
    }

    function BuildTaxiRequest(action, teamId, requestId) {
        var objRequest = {};
        objRequest.action = action;
        objRequest.teamId = teamId;
        objRequest.requestId = requestId;
        objRequest.gameId = $scope.gameId;
        objRequest.year = $scope.gameInfo.year;
        objRequest.startTime = new Date($scope.gameInfo.dateTime).toLocaleString();
        objRequest.divisionId = $scope.gameInfo.divisionId;
        objRequest.fieldId = $scope.gameInfo.fieldId;
        objRequest.userId = authFactory.login.userId;
        if ($scope.taxi.modifyRequest) objRequest.requestTime = $scope.taxi.modifyRequest.requestTime;
        if (action == "Modify" || action == "Expand") {
            objRequest.previousPlayers = $scope.taxi.modifyRequest.players;
            objRequest.previousCatcher = $scope.taxi.modifyRequest.catchers;
            objRequest.numPlayers = $scope.taxi.modifyCount;
            objRequest.catcher = $scope.taxi.modifyCatcher;
            objRequest.gear = $scope.taxi.modifyGear;
        } else {
            objRequest.numPlayers = $scope.taxi.inviteCount;
            objRequest.catcher = $scope.taxi.inviteCatcher;
            objRequest.gear = $scope.taxi.inviteGear;
        }
        return objRequest;
    }

    // The game info has already been returned by the time we get here
    function FormatTaxiDetails() {
        var taxi = $scope.taxi;
        // taxi.info is a sparse array with two entries (home and away indices)
        taxi.info = [];
        var homeInfo = {};
        homeInfo.teamName = $scope.gameInfo.homeName;
        homeInfo.summary = "No Taxi Pool Requests for " + homeInfo.teamName;
        homeInfo.requests = [];
        taxi.info[$scope.gameInfo.homeId] = homeInfo;
        var awayInfo = {};
        awayInfo.teamName = $scope.gameInfo.awayName;
        awayInfo.summary = "No Taxi Pool Requests for " + awayInfo.teamName;
        awayInfo.requests = [];
        taxi.info[$scope.gameInfo.awayId] = awayInfo;
        // Now we loop through all of the taxi request data and build the data lists
        var lastRequestId = -1;
        var currentRequest = null;
        for (var i = 0; i < taxi.details.length; i++) {
            var response = taxi.details[i];
            // Is this new or a continuation of current request?
            if (response.requestId != lastRequestId) {
                var newRequest = response;  // To capture detailed information
                var teamInfo = taxi.info[response.teamId];
                teamInfo.requests.push(newRequest);
                var requestCount = teamInfo.requests.length;
                if (requestCount == 1) {
                    teamInfo.summary = "1 Taxi Pool Request for " + teamInfo.teamName;
                } else {
                    teamInfo.summary = requestCount + " Taxi Pool Requests for " + teamInfo.teamName;
                }
                newRequest.accepted = 0;
                newRequest.declined = 0;
                newRequest.blocked = 0;
                newRequest.pending = 0;
                newRequest.accepts = [];
                currentRequest = newRequest;
                lastRequestId = response.requestId;
            }
            // Update statistics based on response
            if (response.status == "pending") currentRequest.pending++;
            if (response.status == "declined") currentRequest.declined++;
            if (response.status == "blocked") currentRequest.blocked++;
            if (response.status == "accepted") {
                currentRequest.accepted++;
                // Add to accept list if this is an acceptance
                var acceptText = response.responder + " accepted ";
                if (response.catcher == 1) acceptText += " (as catcher) ";
                acceptText += "on " + response.responseTime;
                currentRequest.accepts.push(acceptText);
            }
        }
    }
});