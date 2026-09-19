app.controller('scorebookController', function ($scope, $routeParams, $location, dataFactory, statFactory, authFactory) {

    Utilities.log("Loading scorebookController...");
    $scope.controllerName = "scorebookController" // for batarang debugging
    $scope.controllerId = Math.floor((Math.random() * 10000) + 1); // for debugging
    $scope.objType = "$scope";
    $scope.tabSelected = "Score";

    $scope.callDebug = function () {
        // temp hook for setting breakpoint
        Utilities.log("...callDebug...");
    }

    $scope.isLoading = function () {
        return $scope.loadingData || $scope.lineup.loadingData || $scope.game.loadingData || $scope.score.loadingData || $scope.stats.loadingData || $scope.feedback.loadingData;
    }

    $scope.isTabActive = function (tabName) {
        return tabName == $scope.tabSelected;
    }

    // Navigation Info
    $scope.info = {};

    // Game Info
    $scope.game = {};

    // Init Variables for Lineup Editor
    $scope.lineup = {};
    $scope.lineup.batting = [];
    $scope.lineup.pitching = [];
    $scope.lineup.roster = [];
    $scope.lineup.taxi = [];

    // Init Variables for Stat Editor
    $scope.stats = {};
    $scope.stats.batting = [];
    $scope.stats.pitching = [];

    // Init Variables for Score Editor
    $scope.score = {};
    $scope.score.lineScore = {};

    // Init Variables for Umpire Feedback
    $scope.feedback = {};

    // Init Variables for Scorebook import
    $scope.import = {};

    // Set the starting tab based on parameters
    $scope.startTab = $routeParams.page;

    // Load all of the previously saved data on this game/team
    $scope.info.gameId = $routeParams.gameId;
    $scope.info.teamId = $routeParams.teamId;

    // Load all data
    dataFactory.getRoster($scope.lineup, $scope.info.teamId);
    dataFactory.getTaxiRoster($scope.lineup, $scope.info.teamId, $scope.info.gameId);
    dataFactory.getGameInfo($scope.game, $scope.info.gameId);
    InitScore();
    statFactory.getLineScore($scope.score, $scope.info.gameId);
    statFactory.getBattingStats($scope.stats, "Team", $scope.info.gameId, $scope.info.teamId);
    statFactory.getPitchingStats($scope.stats, "Team", $scope.info.gameId, $scope.info.teamId);

    // Watches set to further process incoming stat data
    $scope.$watch('stats.battingStats', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            ExtractBattingInfo($scope.stats.battingStats);
            $scope.showTab($scope.startTab);
        }
    });

    $scope.$watch('stats.pitchingStats', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            ExtractPitchingInfo($scope.stats.pitchingStats);
        }
    });

    $scope.$watch('lineup.rosterLoaded', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            // It's possible that stats data has already loaded, so if so,
            // process that data
            if ($scope.stats.battingStats && $scope.stats.battingStats.length > 0) {
                ExtractBattingInfo($scope.stats.battingStats);
            }
            if ($scope.stats.pitchingStats && $scope.stats.pitchingStats.length > 0) {
                ExtractPitchingInfo($scope.stats.pitchingStats);
            }
        }
    });

    $scope.$watch('lineup.taxiLoaded', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            // It's possible that stats data has already loaded, so if so,
            // process that data
            if ($scope.stats.battingStats && $scope.stats.battingStats.length > 0) {
                ExtractBattingInfo($scope.stats.battingStats);
            }
            if ($scope.stats.pitchingStats && $scope.stats.pitchingStats.length > 0) {
                ExtractPitchingInfo($scope.stats.pitchingStats);
            }
        }
    });

    // If line score does not exist, set run totals based on game info
    // Must wait for both linescore and game info to load
    $scope.$watch('score.loadingData', function (newValue, oldValue) {
        if (newValue == false && newValue != oldValue) {
            // Fill in missing run totals if necessary
            CheckTotalRuns();
        }
    });

    $scope.$watch('game.loadingData', function (newValue, oldValue) {
        if (newValue == false && newValue != oldValue) {
            // Fill in missing run totals if necessary
            CheckTotalRuns();
        }
    });

    // Watch set for when stat submission call returns $scope.saveStats
    $scope.$watch('saveStats.result', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            // An error return will display automatically. Jump to boxscore if successful
            var result = newValue;  // for debugging
            if (newValue.result == "success") {
                $location.path("/game/" + $scope.info.gameId);
            }
        }
    });

    // Watch set for when stat submission call returns $scope.saveStats
    $scope.$watch('score.result', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            // An error return will display automatically. Indicate success status
            var result = newValue;
        }
    });

    // Watch set to evaluate umpire feedback status
    $scope.$watch('feedback.status', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            // Just determine if error occured or not
            if ($scope.feedback.status == "returned") {
                if ($scope.feedback.result.error != null) {
                    Utilities.log("SubmitFeedback failed with error: " + $scope.feedback.result.error);
                    $scope.feedback.status = "failed";
                } else {
                    $scope.feedback.status = "success";
                }
            }
        }
    });

    // Page Navigation
    $scope.showTab = function (tabName) {
        Utilities.log("Calling showTab for " + tabName);
        //if (tabName == "Score") $scope.activePill = 0;
        //if (tabName == "Lineup") $scope.activePill = 1;
        //if (tabName == "Stats") $scope.activePill = 2;
        //if (tabName == "Umpire") $scope.activePill = 3;
        $scope.tabSelected = tabName;
    }

    // ============ Score Reporting Functions ================
    $scope.score.submit = function () {
        // Need to also pass along userId, teamId and gameId
        $scope.score.teamId = $scope.info.teamId;
        $scope.score.gameId = $scope.info.gameId;
        $scope.score.userId = authFactory.login.userId;
        authFactory.submitScore($scope, $scope.score);
        Utilities.log("Score submitted for gameId = " + $scope.score.gameId);
    }

    // ============ Score Editor Functions ================

    $scope.addInning = function () {
        if ($scope.score.lineScore.awayRuns.length < 15) {
            $scope.score.lineScore.awayRuns.push(0);
            $scope.score.lineScore.homeRuns.push(0);
        }
    }

    $scope.removeInning = function () {
        if ($scope.score.lineScore.awayRuns.length > 3) {
            $scope.score.lineScore.awayRuns.pop();
            $scope.score.lineScore.homeRuns.pop();
        }
    }

    $scope.updateAwayRunTotal = function () {
        $scope.score.lineScore.awayRunTotal = UpdateRunTotal($scope.score.lineScore.awayRuns);
    }

    $scope.updateHomeRunTotal = function () {
        $scope.score.lineScore.homeRunTotal = UpdateRunTotal($scope.score.lineScore.homeRuns);
    }

    function UpdateRunTotal(runArray) {
        var total = 0;
        for (var index = 0; index < runArray.length; index++) {
            var addRuns = Number(runArray[index]);
            total += isNaN(addRuns) ? 0 : addRuns;
        }
        return total;
    }

    function CheckTotalRuns() {
        // Fill in missing run totals if necessary
        if ($scope.game && $scope.game.gameInfo != undefined) {
            if ($scope.score.lineScore.awayRunTotal == undefined) $scope.score.lineScore.awayRunTotal = $scope.game.gameInfo.awayRuns;
            if ($scope.score.lineScore.homeRunTotal == undefined) $scope.score.lineScore.homeRunTotal = $scope.game.gameInfo.homeRuns;
        }
        // Get hits and errors from gameInfo
        $scope.score.lineScore.awayHitTotal = $scope.game.gameInfo.awayHits;
        $scope.score.lineScore.homeHitTotal = $scope.game.gameInfo.homeHits;
        $scope.score.lineScore.awayErrorTotal = $scope.game.gameInfo.awayErrors;
        $scope.score.lineScore.homeErrorTotal = $scope.game.gameInfo.homeErrors;
    }

    function InitScore() {
        $scope.score.lineScore.awayRuns = [];
        $scope.score.lineScore.homeRuns = [];
        $scope.score.lineScore.awayRunTotal = 0;
        $scope.score.lineScore.homeRunTotal = 0;
        for (var inning = 0; inning < 9; inning++) {
            $scope.score.lineScore.awayRuns[inning] = 0;
            $scope.score.lineScore.homeRuns[inning] = 0;
        }
    }

    // ============ Lineup Editor Functions ================

    $scope.lineup.addBatter = function (playerId) {
        var player = findPlayer(playerId);
        player.batting = true;
        $scope.lineup.batting.push(player);
    }

    $scope.lineup.moveBatterUp = function (index) {
        SwapPlayersInList($scope.lineup.batting, index, index - 1);
    }

    $scope.lineup.moveBatterDown = function (index) {
        SwapPlayersInList($scope.lineup.batting, index, index + 1);
    }

    $scope.lineup.removeBatter = function (index) {
        var player = $scope.lineup.batting[index];
        player.batting = false;
        $scope.lineup.batting.splice(index, 1);
    }

    $scope.lineup.addPitcher = function (playerId) {
        var player = findPlayer(playerId);
        player.pitching = true;
        $scope.lineup.pitching.push(player);
    }

    $scope.lineup.movePitcherUp = function (index) {
        SwapPlayersInList($scope.lineup.pitching, index, index - 1);
    }

    $scope.lineup.movePitcherDown = function (index) {
        SwapPlayersInList($scope.lineup.pitching, index, index + 1);
    }

    $scope.lineup.removePitcher = function (index) {
        var player = $scope.lineup.pitching[index];
        player.pitching = false;
        $scope.lineup.pitching.splice(index, 1);
    }

    $scope.lineup.addTaxi = function () {
        $scope.tabSelected = "AddTaxi";
    }

    function SwapPlayersInList(list, index1, index2) {
        var player = list[index1];
        list[index1] = list[index2];
        list[index2] = player;
    }

    function findPlayer(playerId) {
        // find matching playerId in roster list or taxi list
        var playerList = $scope.lineup.roster;
        for (var index = 0; index < playerList.length; index++) {
            var player = playerList[index];
            if (player.playerId == playerId) return player;
        }
        playerList = $scope.lineup.taxi;
        for (var index = 0; index < playerList.length; index++) {
            var player = playerList[index];
            if (player.playerId == playerId) return player;
        }
    }

    function findPlayerByName(playerName) {
        // find matching playerId in roster list or taxi list
        var playerList = $scope.lineup.roster;
        for (var index = 0; index < playerList.length; index++) {
            var player = playerList[index];
            if (playerName == player.firstName + " " + player.lastName) return player;
        }
        playerList = $scope.lineup.taxi;
        for (var index = 0; index < playerList.length; index++) {
            var player = playerList[index];
            if (playerName == player.firstName + " " + player.lastName) return player;
        }
    }

    function isSubstitute(battingOrder) {
        return (Number(battingOrder) != Math.floor(Number(battingOrder)));
    }

    // ============ Stats Reporting Functions ================
    $scope.stats.submit = function () {
        // Need to also pass along userId, teamId and gameId
        $scope.saveStats = {};
        $scope.saveStats.teamId = $scope.info.teamId;
        $scope.saveStats.gameId = $scope.info.gameId;
        $scope.saveStats.userId = authFactory.login.userId;
        $scope.saveStats.batting = $scope.lineup.batting;
        $scope.saveStats.pitching = $scope.lineup.pitching;
        authFactory.submitStats($scope, $scope.saveStats);
        Utilities.log("Stats submitted for gameId = " + $scope.score.gameId);
    }

    // ============ Stats Editor Functions ================
    function ExtractBattingInfo(battingStats) {
        // It is possible that roster has not yet loaded. If so, we can not do this yet
        if (($scope.lineup.roster.length > 0) && $scope.lineup.rosterLoaded && $scope.lineup.taxiLoaded) {
            var boxScore = statFactory.compileBoxScore(battingStats, null);
            for (var index = 0; index < boxScore.battingLines.length; index++) {
                var statLine = boxScore.battingLines[index];
                var playerId = statLine.playerId;
                var player = findPlayer(playerId);
                if (player) {
                    player.battingStats = statLine;
                    player.isSub = isSubstitute(statLine.battingOrder);
                    $scope.lineup.addBatter(playerId);
                }
            }
        }
    }

    function ExtractPitchingInfo(pitchingStats) {
        var temp = pitchingStats;
        // It is possible that roster has not yet loaded. If so, we can not do this yet
        //bb:"1" bf:"0" bk:"0" er:"0" firstName:"Rich" h:"8" hbp:"0" hld:"0" hr:"0" ibb:"0" l:"0" lastName:"Bonny" outs:"27" pit:"0" pitchingOrder:"1" playerId:"555" r:"2" so:"9" str:"0" sv:"0" teamId:"669" w:"1" wp:"0"
        if (($scope.lineup.roster.length > 0) && $scope.lineup.rosterLoaded && $scope.lineup.taxiLoaded) {
            var pitchingSummary = statFactory.compilePitchingSummary(pitchingStats, null);
            for (var index = 0; index < pitchingSummary.pitchingLines.length; index++) {
                var statLine = pitchingSummary.pitchingLines[index];
                var playerId = statLine.playerId;
                var player = findPlayer(playerId);
                if (player) {
                    player.pitchingStats = statLine;
                    player.pitchingStats.fullInnings = Math.floor(Number(statLine.outs) / 3);
                    player.pitchingStats.partInnings = Number(statLine.outs) % 3;
                    player.pitchingStats.win = (player.pitchingStats.w > 0);
                    player.pitchingStats.loss = (player.pitchingStats.l > 0);
                    player.pitchingStats.save = (player.pitchingStats.sv > 0);
                    player.pitchingStats.start = (player.pitchingStats.pitchingOrder == 1);
                    player.pitchingStats.comp = (player.pitchingStats.cg > 0);
                    $scope.lineup.addPitcher(playerId);
                }
            }
        }
    }

    // ============ Umpire Feedback Editor Functions ================
    $scope.feedback.submit = function () {
        // Need to also pass along userId, teamId and gameId
        $scope.feedback.teamId = $scope.info.teamId;
        $scope.feedback.gameId = $scope.info.gameId;
        $scope.feedback.userId = authFactory.login.userId;
        authFactory.submitFeedback($scope, $scope.feedback);
        Utilities.log("Feedback submitted for " + $scope.feedback.umpire);
        $scope.feedback.disabled = true;
    }

    // ============ Stat Import Functions ================
    $scope.import.submit = function () {
        // First step is to attempt to parse box score information
        // If parsing appears successful, go straight into saving stats
        if (ParseBoxScore($scope)) {
            $scope.stats.submit();
        } else {
            // Set error message
            $scope.import.status = "failed";
            if (!scope.import.error) {
                $scope.import.error = "Unable to interpret imported text";
            }
        }
    }


    // Functions for electronic scorekeeping import
    function ParseBoxScore() {
        var importText = $scope.import.boxScore;
   
        // Do some reformatting to handle cut and paste from .csv files
        // Formats are inconsistent based on import method and originating device
        // Try to figure out the format and make appropriate adjustments
        // Default case is cut/paste from iOS
        //var battingStatMap [] = []
        importText = Utilities.replaceAll('"', '', importText);
        importText = Utilities.replaceAll(',', '\t', importText);
   
        // Break out the hitting and pitching stats - specific to iScore for now
        var battingStats = Utilities.extractBetween("QAB3%", "TOTALS", importText);
        var pitchingStats = Utilities.extractBetween("FPS%", "TOTAL", importText);

        // Batting Stats
        $scope.lineup.batting = [];
        var battingLines = battingStats.split("\n");
        for (i = 0; i < battingLines.length; i++) {
            line = battingLines[i];
            // Ignore blank lines
            if (line.length > 10) {
                var battingStats = line.split("\t");
                // Only include participating players
                if (battingStats[1] == 1) { // G = 1
                    var playerName = battingStats[0];
                    var player = findPlayerByName(playerName);
                    if (!player) {
                        $scope.import.error = "Unable to identify batter - " + playerName;
                        return false;
                    }
                    //#	PLAYER	G	PA	AB	R	H	B	1B	2B	3B	(10)HR	RBI	AVG	BB	Kc	(15)Ks	SO	HBP	SB	CS	(20)SCB	SF	SAC	RPA	OBP	OBPE	SLG	OPS	GPA	BABIP	(30)CT% CT2 % ROE	FC	CI	GDP	GTP	AB/ RSP	H/ RSP	BA/ RSP	QAB1% QAB2 % QAB3 %
                    player.battingStats = {};
                    player.battingStats.ab = battingStats[3];
                    player.battingStats.r = battingStats[4];
                    player.battingStats.h = battingStats[5];
                    player.battingStats.rbi = battingStats[11];
                    player.battingStats.d = battingStats[8];
                    player.battingStats.t = battingStats[9];
                    player.battingStats.hr = battingStats[10];
                    player.battingStats.bb = battingStats[13];
                    player.battingStats.so = battingStats[16];
                    player.battingStats.sb = battingStats[18];
                    player.battingStats.cs = battingStats[19];
                    player.battingStats.hbp = battingStats[17];
                    player.battingStats.sh = battingStats[22];
                    player.battingStats.sf = battingStats[21];
                    player.battingStats.ci = battingStats[34];
                    player.battingStats.gdp = battingStats[35];
                    player.battingStats.rboe = battingStats[32];
                    $scope.lineup.addBatter(player.playerId);
                }
            }
        }

        // Pitching Stats
        var pitchingLines = pitchingStats.split("\n");
        for (i = 0; i < pitchingLines.length; i++) {
            line = pitchingLines[i];
            // Ignore blank lines
            if (line.length > 10) {
                var pitchingStats = line.split("\t");
                // Only include participating players
                if (pitchingStats[2] == 1) { // G = 1
                    var playerName = pitchingStats[1];
                    var player = findPlayerByName(playerName);
                    if (!player) {
                        $scope.import.error = "Unable to identify pitcher - " + playerName;
                        return false;
                    }
                    //#	PLAYER	G	W	L	SV	IP	BF	Ball	Str	(10)PIT	R	RA	ER	ERA	ERA9	FIP	K	Kc	Ks	H	BB	IBB	K/BB	K/GI	BB/GI	H/GI	HB	BK	WP	HR	WHIP	OBP	BAA	BABIP	GO	AO	FPS	FPB	FPS%
                    player.pitchingStats = {};
                    player.pitchingStats.win = pitchingStats[3];
                    player.pitchingStats.loss = pitchingStats[4];
                    player.pitchingStats.save = pitchingStats[5];
                    player.pitchingStats.fullInnings = Math.floor(pitchingStats[6]);
                    player.pitchingStats.partInnings = Math.floor(3 * (pitchingStats[6] - Math.floor(pitchingStats[6])) + 0.1);
                    player.pitchingStats.r = pitchingStats[11];
                    player.pitchingStats.er = pitchingStats[13];
                    player.pitchingStats.h = pitchingStats[20];
                    player.pitchingStats.bb = pitchingStats[21];
                    player.pitchingStats.so = pitchingStats[17];
                    player.pitchingStats.hbp = pitchingStats[27];
                    player.pitchingStats.bk = pitchingStats[28];
                    player.pitchingStats.wp = pitchingStats[29];
                    player.pitchingStats.bf = pitchingStats[7];
                    player.pitchingStats.pit = pitchingStats[10];
                    player.pitchingStats.str = pitchingStats[9];
                    $scope.lineup.addPitcher(player.playerId);
                }
            }
        }
        return true;
    }

    // Local Functions

    function CheckForDisabled(functionality) {
        // Right now, everything that calls this is disabled.
        $location.path("/message/disabled");
    }
});