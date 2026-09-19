app.factory('statFactory', function (dataFactory) {

    // Handle processing of all stats and box scores

    var statFactory = {};

    //============ Public methods that retrieve stats from database =============

    //========================== STATS ===============================
    /*
        Retrieve Stats...
        API: ?type=BattingStats&gameId=6101&teamId=565 (-teamId)
        API: ?type=PitchingStats&gameId=6101&teamId=565 (-teamId)
        API: ?type=CumulativeBatting&gameId=6101&divisionId&teamId=565 (-divisionId || -teamId || -gameId)
        API: ?type=CumulativePitching&gameId=6101&teamId=565 (-divisionId || -teamId || -gameId)
        API: ?type=CareerBatting&playerId=666
        API: ?type=CareerPitching&playerId=666
        API: ?type=LineScore&gameId=1000
        */

    statFactory.getBattingStats = function (callingScope, statType, gameId, teamId) {
        request = "BattingStats&gameId=" + gameId;
        if (teamId !== undefined) request += "&teamId=" + teamId;
        dataFactory.startDataLoad(callingScope, "getBattingStats");
        dataFactory.requestHttp(request)
        .then(function successCallback(response) {
            if (statType == "Home") {
                callingScope.homeBattingStats = response.data;
            } else if (statType == "Away") {
                callingScope.awayBattingStats = response.data;
            } else {
                callingScope.battingStats = response.data;
            }
            dataFactory.finishDataLoad(callingScope, "getBattingStats");
        }, function errorCallback(response) {
            dataFactory.reportError("getBattingStats", response);
            dataFactory.failDataLoad(callingScope, "getBattingStats");
        });
    }

    statFactory.getPitchingStats = function (callingScope, statType, gameId, teamId) {
        request = "PitchingStats&gameId=" + gameId;
        if (teamId !== undefined) request += "&teamId=" + teamId;
        dataFactory.startDataLoad(callingScope, "getPitchingStats");
        dataFactory.requestHttp(request)
        .then(function successCallback(response) {
            if (statType == "Home") {
                callingScope.homePitchingStats = response.data;
            } else if (statType == "Away") {
                callingScope.awayPitchingStats = response.data;
            } else {
                callingScope.pitchingStats = response.data;
            }
            dataFactory.finishDataLoad(callingScope, "getPitchingStats");
        }, function errorCallback(response) {
            dataFactory.reportError("getPitchingStats", response);
            dataFactory.failDataLoad(callingScope, "getPitchingStats");
        });
    }

    // Revised to use params
    statFactory.getCumulativeBatting = function (callingScope, params) {
        request = "CumulativeBatting";
        if (params.gameId) request += "&gameId=" + params.gameId;
        if (params.teamId) request += "&teamId=" + params.teamId;
        if (params.division) request += "&division=" + params.division;
        if (params.year) request += "&year=" + params.year;
        if (params.group) request += "&group=" + params.group;
        dataFactory.startDataLoad(callingScope, "getCumulativeBatting");
        dataFactory.requestHttp(request)
        .then(function successCallback(response) {
            stats = response.data;
            battingTotals = {}
            for (var i = 0; i < stats.length; i++) {
                AddBattingStats(battingTotals, stats[i]);
                DeriveBattingStats(stats[i]);
            }
            if (params.statType == "Home") {
                callingScope.homeCumulativeBattingStats = stats;
            } else if (params.statType == "Away") {
                callingScope.awayCumulativeBattingStats = stats;
            } else {
                DeriveBattingStats(battingTotals);
                callingScope.cumulativeBattingStats = stats;
                callingScope.cumulativeBattingTotals = battingTotals;
                if (callingScope.sortBatting) callingScope.sortBatting('avg');
            }
            dataFactory.finishDataLoad(callingScope, "getCumulativeBatting");
        }, function errorCallback(response) {
            dataFactory.reportError("getCumulativeBatting", response);
            dataFactory.failDataLoad(callingScope, "getCumulativeBatting");
        });
    }

    statFactory.getCumulativePitching = function (callingScope, params) {
        request = "CumulativePitching";
        if (params.gameId) request += "&gameId=" + params.gameId;
        if (params.teamId) request += "&teamId=" + params.teamId;
        if (params.division) request += "&division=" + params.division;
        if (params.year) request += "&year=" + params.year;
        if (params.group) request += "&group=" + params.group;
        dataFactory.startDataLoad(callingScope, "getCumulativePitching");
        dataFactory.requestHttp(request)
        .then(function successCallback(response) {
            stats = response.data;
            pitchingTotals = {}
            for (var i = 0; i < stats.length; i++) {
                AddPitchingStats(pitchingTotals, stats[i]);
                DerivePitchingStats(stats[i]);
            }
            if (params.statType == "Home") {
                callingScope.homeCumulativePitchingStats = stats;
            } else if (params.statType == "Away") {
                callingScope.awayCumulativePitchingStats = stats;
            } else {
                DerivePitchingStats(pitchingTotals);
                callingScope.cumulativePitchingStats = stats;
                callingScope.cumulativePitchingTotals = pitchingTotals;
                if (callingScope.sortPitching) callingScope.sortPitching('era');
            }
            dataFactory.finishDataLoad(callingScope, "getCumulativePitching");
        }, function errorCallback(response) {
            dataFactory.reportError("getCumulativePitching", response);
            dataFactory.failDataLoad(callingScope, "getCumulativePitching");
        });
    }

    statFactory.getCareerBattingStats = function (callingScope, playerId) {
        // type=CareerBatting&playerId=668
        request = "CareerBatting&playerId=" + playerId;
        dataFactory.startDataLoad(callingScope, "getCareerBattingStats");
        dataFactory.requestHttp(request)
            .then(function successCallback(response) {
                var stats = response.data;
                ProcessBattingStats(callingScope, stats);
                callingScope.careerBattingStats = stats;
                dataFactory.finishDataLoad(callingScope, "getCareerBattingStats");
            }, function errorCallback(response) {
                dataFactory.reportError("getCareerBatting", response);
                dataFactory.failDataLoad(callingScope, "getCareerBattingStats");
            });
    }

    statFactory.getCareerPitchingStats = function (callingScope, playerId) {
        // type=CareerPitching&playerId=668
        request = "CareerPitching&playerId=" + playerId;
        dataFactory.startDataLoad(callingScope, "getCareerPitchingStats");
        dataFactory.requestHttp(request)
            .then(function successCallback(response) {
                var stats = response.data;
                ProcessPitchingStats(callingScope, stats);
                callingScope.careerPitchingStats = stats;
                dataFactory.finishDataLoad(callingScope, "getCareerPitchingStats");
            }, function errorCallback(response) {
                dataFactory.reportError("getCareerBatting", response);
                dataFactory.failDataLoad(callingScope, "getCareerPitchingStats");
            });
    }

    statFactory.getCareerBattingLeaders = function (callingScope, searchParams) {
        // type=CareerBatting&aggregate=Career&sortBy=h
        request = "CareerBattingLeaders";
        request += "&aggregate=" + searchParams.type;
        request += "&scope=" + searchParams.scope;
        if (searchParams.year) request += "&year=" + searchParams.year;
        if (searchParams.division) request += "&division=" + searchParams.division;
        if (searchParams.teamId) request += "&teamId=" + searchParams.teamId;
        if (searchParams.restrict) request += "&restrict=" + searchParams.restrict;
        request += "&sortBy=" + callingScope.battingStats[Number(searchParams.stat)];

        dataFactory.startDataLoad(callingScope, "getCareerBattingLeaders");
        dataFactory.requestHttp(request)
            .then(function successCallback(response) {
                var stats = response.data;
                ProcessBattingStats(callingScope, stats);
                callingScope.results = stats;
                callingScope.totalItems = stats.length;
                dataFactory.finishDataLoad(callingScope, "getCareerBattingLeaders");
            }, function errorCallback(response) {
                callingScope.stats = [];
                dataFactory.reportError("getCareerBattingLeaders", response);
                dataFactory.failDataLoad(callingScope, "getCareerBattingLeaders");
            });
    }

    statFactory.getCareerPitchingLeaders = function (callingScope, searchParams) {
        // type=CareerPitching&aggregate=Career&sortBy=w
        request = "CareerPitchingLeaders";
        request += "&aggregate=" + searchParams.type;
        request += "&scope=" + searchParams.scope;
        if (searchParams.year) request += "&year=" + searchParams.year;
        if (searchParams.division) request += "&division=" + searchParams.division;
        if (searchParams.teamId) request += "&teamId=" + searchParams.teamId;
        if (searchParams.restrict) request += "&restrict=" + searchParams.restrict;
        request += "&sortBy=" + callingScope.pitchingStats[Number(searchParams.stat)];

        dataFactory.startDataLoad(callingScope, "getCareerPitchingLeaders");
        dataFactory.requestHttp(request)
            .then(function successCallback(response) {
                var stats = response.data;
                ProcessPitchingStats(callingScope, stats);
                callingScope.results = stats;
                callingScope.totalItems = stats.length;
                dataFactory.finishDataLoad(callingScope, "getCareerPitchingLeaders");
            }, function errorCallback(response) {
                dataFactory.reportError("getCareerPitchingLeaders", response);
                dataFactory.failDataLoad(callingScope, "getCareerPitchingLeaders");
            });
    }

    statFactory.getLineScore = function (callingScope, gameId) {
        // type=LineScore&gameId=5000
        request = "LineScore&gameId=" + gameId;
        dataFactory.startDataLoad(callingScope, "getLineScore");
        dataFactory.requestHttp(request)
        .then(function successCallback(response) {
            callingScope.lineScore = ExtractLineScore(response.data);
            dataFactory.finishDataLoad(callingScope, "getLineScore");
        }, function errorCallback(response) {
            dataFactory.reportError("getCareerBatting", response);
            dataFactory.failDataLoad(callingScope, "getLineScore");
        });
    }

    statFactory.getBattingLog = function (callingScope, playerId, year) {
        // type=BattingLog&playerId=668
        request = "BattingLog&playerId=" + playerId + "&year=" + year;
        dataFactory.startDataLoad(callingScope, "getBattingLog");
        dataFactory.requestHttp(request)
        .then(function successCallback(response) {
            var logs = response.data;
            CompileBattingLogs(callingScope, logs);
            dataFactory.finishDataLoad(callingScope, "getBattingLog");
        }, function errorCallback(response) {
            dataFactory.reportError("getBattingLog", response);
            dataFactory.failDataLoad(callingScope, "getBattingLog");
        });
    }

    statFactory.getPitchingLog = function (callingScope, playerId, year) {
        // type=BattingLog&playerId=668&year=2015
        request = "PitchingLog&playerId=" + playerId + "&year=" + year;
        dataFactory.startDataLoad(callingScope, "getPitchingLog");
        dataFactory.requestHttp(request)
        .then(function successCallback(response) {
            var logs = response.data;
            CompilePitchingLogs(callingScope, logs);
            dataFactory.finishDataLoad(callingScope, "getPitchingLog");
        }, function errorCallback(response) {
            dataFactory.reportError("getPitchingLog", response);
            dataFactory.failDataLoad(callingScope, "getPitchingLog");
        });
    }

    // Compilation functions are synchronous and return a populated object

    statFactory.compileBoxScore = function (gameBattingStats, cumulativeBattingStats) {
        var boxScore = {};
        boxScore.battingLines = [];
        boxScore.extraStats = {};
        var playerCollection = {};
        var battingPositions = {};
        var gameTotals = {};

        // Bail out early if no stats have been entered
        if (!gameBattingStats || gameBattingStats.length == 0) return boxScore;

        // First sort batting stats in appearance order or substitutes will not be
        // identified properly
        gameBattingStats.sort(function (a, b) {
            aOrder = Number(a.inning) + .01 * Number(a.battingOrder);
            bOrder = Number(b.inning) + .01 * Number(b.battingOrder);
            return aOrder - bOrder;
        });


        // Otherwise loop through each stat line
        for (var i = 0; i < gameBattingStats.length; i++) {
            var statLine = gameBattingStats[i];
            var playerId = statLine.playerId;
            var battingOrder = statLine.battingOrder;
            if (playerCollection[playerId]) {
                AddBattingStats(playerCollection[playerId], statLine);
            } else {
                while (battingPositions[statLine.battingOrder]) {
                    statLine.battingOrder = Number(statLine.battingOrder) + 0.1;
                }
                battingPositions[statLine.battingOrder] = true;
                playerCollection[playerId] = statLine;
            }
            AddBattingStats(gameTotals, statLine);
        }

        // Now that the statlines have been assembled, process the cumulative stats and
        // see if we can match them up with players in the lineup.
        var totalSeasonStats = {};
        for (seasonStats in cumulativeBattingStats) {
            seasonStatLine = cumulativeBattingStats[seasonStats];
            AddBattingStats(totalSeasonStats, seasonStatLine);
            var teamPlayerId = seasonStatLine.playerId;
            var player = playerCollection[teamPlayerId];
            if (player) {
                DeriveBattingStats(seasonStatLine);
                player.avg = seasonStatLine.avg;
                player.obp = seasonStatLine.obp;
                player.slg = seasonStatLine.slg;
                // While we are here look for extra stats to include after the box score
                if (player.d > 0) AddExtraStat(boxScore.extraStats, "2B", player, player.d, seasonStatLine.d);
                if (player.t > 0) AddExtraStat(boxScore.extraStats, "3B", player, player.t, seasonStatLine.t);
                if (player.hr > 0) AddExtraStat(boxScore.extraStats, "HR", player, player.hr, seasonStatLine.hr);
                if (player.sb > 0) AddExtraStat(boxScore.extraStats, "SB", player, player.sb, seasonStatLine.sb);
                if (player.cs > 0) AddExtraStat(boxScore.extraStats, "CS", player, player.cs, seasonStatLine.cs);
                if (player.gdp > 0) AddExtraStat(boxScore.extraStats, "GDP", player, player.gdp, seasonStatLine.gdp);
                if (player.hbp > 0) AddExtraStat(boxScore.extraStats, "HBP", player, player.hbp, seasonStatLine.hbp);
                if (player.rboe > 0) AddExtraStat(boxScore.extraStats, "RBOE", player, player.rboe, seasonStatLine.rboe);
                if (player.sh > 0) AddExtraStat(boxScore.extraStats, "SAC", player, player.sh, seasonStatLine.sh);
                if (player.sf > 0) AddExtraStat(boxScore.extraStats, "SF", player, player.sf, seasonStatLine.sf);
                if (player.ci > 0) AddExtraStat(boxScore.extraStats, "CI", player, player.ci, seasonStatLine.ci);
            }
        }
        //{"playerId":"843","firstName":"Carl","lastName":"Gleason","teamId":"635","battingOrder":"6","inning":"2","ab":"1","r":"1","h":"0","d":"0","t":"0","hr":"0","rbi":"0","sb":"1","cs":"0","bb":"0","so":"0","gdp":"0","hbp":"0","rboe":"1","sh":"0","sf":"0"}
        // Get the team season averages and plug them into the total line
        DeriveBattingStats(totalSeasonStats);
        gameTotals.avg = totalSeasonStats.avg;
        gameTotals.obp = totalSeasonStats.obp;
        gameTotals.slg = totalSeasonStats.slg;

        // Now we package it all together in the boxScore object and return it.
        for (player in playerCollection) {
            statLine = playerCollection[player];
            boxScore.battingLines.push(statLine);
        }
        boxScore.battingLines.sort(function (a, b) { return Number(a.battingOrder) - Number(b.battingOrder) });
        boxScore.gameTotals = gameTotals;
        return boxScore;
    }

    statFactory.compilePitchingSummary = function (gamePitchingStats, cumulativePitchingStats) {
        var pitchingSummary = {};
        pitchingSummary.pitchingLines = [];
        pitchingSummary.extraStats = {};
        var playerCollection = {};
        var gameTotals = {};

        // Bail out early if no stats have been entered
        if (!gamePitchingStats || gamePitchingStats.length == 0) return pitchingSummary;

        // Loop through each stat line
        for (var i = 0; i < gamePitchingStats.length; i++) {
            var statLine = gamePitchingStats[i];
            var playerId = statLine.playerId;
            // Unlike batting, there is only one line per pitcher, so no need to aggregate
            // TODO: determine winner/loser/save
            DerivePitchingStats(statLine);  // just to compute .ip from .outs
            playerCollection[playerId] = statLine;
            AddPitchingStats(gameTotals, statLine);
        }

        // Now that the statlines have been assembled, process the cumulative stats and
        // see if we can match them up with players in the pitching lineup.
        var totalSeasonStats = {};
        for (seasonStats in cumulativePitchingStats) {
            seasonStatLine = cumulativePitchingStats[seasonStats];
            AddPitchingStats(totalSeasonStats, seasonStatLine);
            var teamPlayerId = seasonStatLine.playerId;
            var player = playerCollection[teamPlayerId];
            if (player) {
                DerivePitchingStats(seasonStatLine);
                player.era = seasonStatLine.era;
                player.whip = seasonStatLine.whip;

                // Process wins, losses, saves
                if (player.w > 0) {
                    player.extra = "(W, " + seasonStatLine.w + "-" + seasonStatLine.l + ")";
                    pitchingSummary.wp = player.firstName + " " + player.lastName
                                       + " (" + seasonStatLine.w + "-" + seasonStatLine.l + ")";
                    pitchingSummary.wpId = player.playerId;
                }
                if (player.l > 0) {
                    player.extra = "(L, " + seasonStatLine.w + "-" + seasonStatLine.l + ")";
                    pitchingSummary.lp = player.firstName + " " + player.lastName
                                       + " (" + seasonStatLine.w + "-" + seasonStatLine.l + ")";
                    pitchingSummary.lpId = player.playerId;
                }
                if (player.sv > 0) {
                    player.extra = "(S, " + seasonStatLine.sv + ")";
                    pitchingSummary.sp = player.firstName + " " + player.lastName
                                       + " (" + seasonStatLine.sv + ")";
                    pitchingSummary.spId = player.playerId;
                }
                // While we are here look for extra stats to include after the box score
                if (player.ibb > 0) AddExtraStat(pitchingSummary.extraStats, "IBB", player, player.ibb, seasonStatLine.ibb);
                if (player.hbp > 0) AddExtraStat(pitchingSummary.extraStats, "HBP", player, player.hbp, seasonStatLine.hbp);
                if (player.hr > 0) AddExtraStat(pitchingSummary.extraStats, "HR", player, player.hr, seasonStatLine.hr);
                if (player.bk > 0) AddExtraStat(pitchingSummary.extraStats, "BK", player, player.bk, seasonStatLine.bk);
                if (player.wp > 0) AddExtraStat(pitchingSummary.extraStats, "WP", player, player.wp, seasonStatLine.wp);
                if (player.bf > 0) AddExtraStat(pitchingSummary.extraStats, "BF", player, player.bf, seasonStatLine.bf);
                if (player.pit > 0) AddExtraStat(pitchingSummary.extraStats, "PIT", player, player.pit, seasonStatLine.pit);
                if (player.str > 0) AddExtraStat(pitchingSummary.extraStats, "STR", player, player.str, seasonStatLine.str);
            }
        }
        //{"playerId":"531","firstName":"David","lastName":"Pearce","teamId":"632","pitchingOrder":"3","outs":"1","w":"0","l":"0","hld":"0","sv":"0","h":"7","r":"10","er":"10","hr":"0","ibb":"0","bb":"3","so":"0","hbp":"0","bk":"0","wp":"0","bf":"11","pit":"29","str":"10"}

        // Get the team season averages and plug them into the total line
        DerivePitchingStats(gameTotals);    // just to get .ip from .outs
        DerivePitchingStats(totalSeasonStats);
        gameTotals.era = totalSeasonStats.era;
        gameTotals.whip = totalSeasonStats.whip;

        // Now we package it all together in the pitchingSummary object and return it.
        for (player in playerCollection) {
            statLine = playerCollection[player];
            pitchingSummary.pitchingLines.push(statLine);
        }
        pitchingSummary.pitchingLines.sort(function (a, b) { return a.pitchingOrder - b.pitchingOrder });
        pitchingSummary.gameTotals = gameTotals;
        return pitchingSummary;
    }

    statFactory.sortBattingStats = function (battingStats, sortProperty) {
        if (sortProperty == "Name") {
            battingStats.sort(function (a, b) {
                if ((b.lastName + " " + b.firstName) > (a.lastName + " " + a.firstName)) {
                    return -1;
                } else {
                    return 1;
                }
            });
        } else if (sortProperty == "teamName") {
            battingStats.sort(function (a, b) { return (b[sortProperty] > a[sortProperty]) ? -1: 1; });
        } else {
            battingStats.sort(function (a, b) { return b[sortProperty] - a[sortProperty] });
        }
    }

    statFactory.sortPitchingStats = function (pitchingStats, sortProperty) {
        if (sortProperty == "Name") {
            pitchingStats.sort(function (a, b) {
                if ((b.lastName + " " + b.firstName) > (a.lastName + " " + a.firstName)) {
                    return -1;
                } else {
                    return 1;
                }
            });
        } else if (("__era_whip_bb9_").search("_" + sortProperty + "_") > 0) {
            pitchingStats.sort(function (a, b) { return a[sortProperty] - b[sortProperty] }); // sort low to high
        } else if (sortProperty == "teamName") {
            pitchingStats.sort(function (a, b) { return (b[sortProperty] > a[sortProperty]) ? -1 : 1; });
        } else {
            pitchingStats.sort(function (a, b) { return b[sortProperty] - a[sortProperty] }); // sort high to low
        }
    }

    return statFactory;

    //============  Local statistics functions ================

    //Season	G	PA	AB	R	H	2B	3B	HR	RBI	SB	CS	BB	SO	AVG	OBP	SLG	OPS	TB	HBP	SH	SF	IBB
    function ProcessBattingStats(callingScope, stats) {
        // Aggregate totals and also compute derived stats
        var battingTotals = {};
        battingTotals.year = stats.length + " Years";
        for (var i = 0; i < stats.length; i++) {
            statLine = stats[i];
            AddBattingStats(battingTotals, statLine);
            DeriveBattingStats(statLine);
            statLine.rank = i + 1;
        }
        DeriveBattingStats(battingTotals);
        callingScope.careerBattingTotals = battingTotals;
        var batting162 = {};
        batting162.year = "162 game average";
        batting162.g = 162;
        var ratio = 162.0 / battingTotals.g;
        batting162.ab = Math.round(ratio * battingTotals.ab);
        batting162.r = Math.round(ratio * battingTotals.r);
        batting162.h = Math.round(ratio * battingTotals.h);
        batting162.d = Math.round(ratio * battingTotals.d);
        batting162.t = Math.round(ratio * battingTotals.t);
        batting162.hr = Math.round(ratio * battingTotals.hr);
        batting162.rbi = Math.round(ratio * battingTotals.rbi);
        batting162.sb = Math.round(ratio * battingTotals.sb);
        batting162.cs = Math.round(ratio * battingTotals.cs);
        batting162.bb = Math.round(ratio * battingTotals.bb);
        batting162.so = Math.round(ratio * battingTotals.so);
        batting162.hbp = Math.round(ratio * battingTotals.hbp);
        batting162.sh = Math.round(ratio * battingTotals.sh);
        batting162.sf = Math.round(ratio * battingTotals.sf);
        batting162.ibb = Math.round(ratio * battingTotals.ibb);
        batting162.pa = Math.round(ratio * battingTotals.pa);
        batting162.tb = Math.round(ratio * battingTotals.tb);
        batting162.avg = battingTotals.avg;
        batting162.obp = battingTotals.obp;
        batting162.slg = battingTotals.slg;
        batting162.ops = battingTotals.ops;
        callingScope.careerBattingStats = battingTotals;
        callingScope.careerBattingAve = batting162;
    }

    function AddBattingStats(statLineTotal, statLineAdd) {
        statLineTotal.g = GetTotal(statLineTotal.g, statLineAdd.g);
        statLineTotal.ab = GetTotal(statLineTotal.ab, statLineAdd.ab);
        statLineTotal.r = GetTotal(statLineTotal.r, statLineAdd.r);
        statLineTotal.h = GetTotal(statLineTotal.h, statLineAdd.h);
        statLineTotal.d = GetTotal(statLineTotal.d, statLineAdd.d);
        statLineTotal.t = GetTotal(statLineTotal.t, statLineAdd.t);
        statLineTotal.hr = GetTotal(statLineTotal.hr, statLineAdd.hr);
        statLineTotal.rbi = GetTotal(statLineTotal.rbi, statLineAdd.rbi);
        statLineTotal.sb = GetTotal(statLineTotal.sb, statLineAdd.sb);
        statLineTotal.cs = GetTotal(statLineTotal.cs, statLineAdd.cs);
        statLineTotal.bb = GetTotal(statLineTotal.bb, statLineAdd.bb);
        statLineTotal.so = GetTotal(statLineTotal.so, statLineAdd.so);
        statLineTotal.hbp = GetTotal(statLineTotal.hbp, statLineAdd.hbp);
        statLineTotal.sh = GetTotal(statLineTotal.sh, statLineAdd.sh);
        statLineTotal.sf = GetTotal(statLineTotal.sf, statLineAdd.sf);
        statLineTotal.gdp = GetTotal(statLineTotal.gdp, statLineAdd.gdp);
        statLineTotal.ibb = GetTotal(statLineTotal.ibb, statLineAdd.ibb);
        statLineTotal.ci = GetTotal(statLineTotal.ci, statLineAdd.ci);
    }

    //Season	G	PA	AB	R	H	2B	3B	HR	RBI	SB	CS	BB	SO	AVG	OBP	SLG	OPS	TB	HBP	SH	SF	IBB
    function DeriveBattingStats(statLine) {
        statLine.pa = Number(statLine.ab) + Number(statLine.bb) + Number(statLine.hbp) + Number(statLine.sh) + Number(statLine.sf);
        statLine.tb = Number(statLine.h) + Number(statLine.d) + 2 * Number(statLine.t) + 3 * Number(statLine.hr);
        statLine.avg = GetAve(statLine.h, statLine.ab);
        // Remove SH and CI from plate appearances when calculating OBP
        statLine.obp = GetAve(Number(statLine.h) + Number(statLine.bb) + Number(statLine.hbp), (statLine.pa - statLine.sh - statLine.ci));
        statLine.slg = GetAve(statLine.tb, statLine.ab);
        statLine.ops = GetAve(Number(statLine.obp) + Number(statLine.slg), 1.0);
    }

    function CompileBattingLogs(callingScope, logs) {
        var battingLog = {};
        for (index = 0; index < logs.length; index++) {
            var teamId = logs[index].teamId;
            if (!battingLog[teamId]) {
                battingLog[teamId] = {};
                battingLog[teamId].battingLines = [];
                battingLog[teamId].battingTotals = {};
            }
            var battingLine = logs[index];
            AddBattingStats(battingLog[teamId].battingTotals, battingLine);
            DeriveBattingStats(battingLine); // For PA and TB
            DeriveBattingStats(battingLog[teamId].battingTotals);
            battingLine.gameTime = new Date(battingLine.gameTime);
            // Add subfields to batting line AVG OBP SLG OPS
            battingLine.avg = battingLog[teamId].battingTotals.avg;
            battingLine.obp = battingLog[teamId].battingTotals.obp;
            battingLine.slg = battingLog[teamId].battingTotals.slg;
            battingLine.ops = battingLog[teamId].battingTotals.ops;
            if (battingLine.homeId == battingLine.teamId) {
                opponentName = dataFactory.getTeamName(battingLine.awayId);
                battingLine.opponent = "vs. " + opponentName;

            } else {
                opponentName = dataFactory.getTeamName(battingLine.homeId);
                battingLine.opponent = "@ " + opponentName;
            }
            battingLog[teamId].battingLines.push(battingLine);
        }
        callingScope.battingLog = battingLog;
    }

    function GetTotal(firstNum, secondNum) {
        if (!firstNum) return secondNum;
        if (!secondNum) return firstNum;
        return Number(firstNum) + Number(secondNum);
    }

    function GetAve(numerator, denominator) {
        if (denominator == 0) return ".000";
        var ave = (numerator / denominator).toFixed(3);
        if (ave.charAt(0) == "0") return ave.slice(1);
        return ave;
    }

    function AddExtraStat(extraStats, label, player, forGame, forSeason) {
        var addItem = player.firstName.substring(0, 1) + ". " + player.lastName;
        if (forGame > 1) addItem += " " + forGame + " ";
        addItem += " (" + forSeason + ")";
        if (extraStats[label]) {
            extraStats[label] += ", " + addItem;
        } else {
            extraStats[label] = addItem;
        }
    }

    //AddExtraStat(boxScore.extraStats, "HR", player, player.hr, seasonStatLine.hr);

    // G	W	L	GS	GF	CG	SV	IP	H	R	ER	HR	BB	IBB	K	HBP	BK	WP	BF	ERA	WHIP	K/9	BB/9	PIT	STR
    function ProcessPitchingStats(callingScope, stats) {
        // Aggregate totals and also compute derived stats
        var pitchingTotals = {};
        pitchingTotals.year = stats.length + " Years";
        for (var i = 0; i < stats.length; i++) {
            statLine = stats[i];
            pitchingTotals.g = GetTotal(pitchingTotals.g, statLine.g);
            pitchingTotals.w = GetTotal(pitchingTotals.w, statLine.w);
            pitchingTotals.l = GetTotal(pitchingTotals.l, statLine.l);
            pitchingTotals.gs = GetTotal(pitchingTotals.gs, statLine.gs);
            pitchingTotals.gf = GetTotal(pitchingTotals.gf, statLine.gf);
            pitchingTotals.cg = GetTotal(pitchingTotals.cg, statLine.cg);
            pitchingTotals.sv = GetTotal(pitchingTotals.sv, statLine.sv);
            pitchingTotals.outs = GetTotal(pitchingTotals.outs, statLine.outs);
            pitchingTotals.h = GetTotal(pitchingTotals.h, statLine.h);
            pitchingTotals.r = GetTotal(pitchingTotals.r, statLine.r);
            pitchingTotals.er = GetTotal(pitchingTotals.er, statLine.er);
            pitchingTotals.hr = GetTotal(pitchingTotals.hr, statLine.hr);
            pitchingTotals.bb = GetTotal(pitchingTotals.bb, statLine.bb);
            pitchingTotals.ibb = GetTotal(pitchingTotals.ibb, statLine.ibb);
            pitchingTotals.so = GetTotal(pitchingTotals.so, statLine.so);
            pitchingTotals.hbp = GetTotal(pitchingTotals.hbp, statLine.hbp);
            pitchingTotals.bk = GetTotal(pitchingTotals.bk, statLine.bk);
            pitchingTotals.wp = GetTotal(pitchingTotals.wp, statLine.wp);
            pitchingTotals.bf = GetTotal(pitchingTotals.bf, statLine.bf);
            pitchingTotals.pit = GetTotal(pitchingTotals.pit, statLine.pit);
            pitchingTotals.str = GetTotal(pitchingTotals.str, statLine.str);
            DerivePitchingStats(statLine);
            statLine.rank = i + 1;
        }
        DerivePitchingStats(pitchingTotals);
        callingScope.careerPitchingTotals = pitchingTotals;
        var pitching162 = {};
        pitching162.year = "162 game average"
        pitching162.g = 162;
        var ratio = 162.0 / pitchingTotals.g;
        pitching162.w = Math.round(ratio * pitchingTotals.w);
        pitching162.l = Math.round(ratio * pitchingTotals.l);
        pitching162.gs = Math.round(ratio * pitchingTotals.gs);
        pitching162.gf = Math.round(ratio * pitchingTotals.gf);
        pitching162.cg = Math.round(ratio * pitchingTotals.cg);
        pitching162.sv = Math.round(ratio * pitchingTotals.sv);
        pitching162.outs = Math.round(ratio * pitchingTotals.outs);
        pitching162.h = Math.round(ratio * pitchingTotals.h);
        pitching162.r = Math.round(ratio * pitchingTotals.r);
        pitching162.er = Math.round(ratio * pitchingTotals.er);
        pitching162.hr = Math.round(ratio * pitchingTotals.hr);
        pitching162.bb = Math.round(ratio * pitchingTotals.bb);
        pitching162.ibb = Math.round(ratio * pitchingTotals.ibb);
        pitching162.so = Math.round(ratio * pitchingTotals.so);
        // Finish later - not showing anyway
        callingScope.careerPitchingStats = pitchingTotals;
        callingScope.careerPitchingAve = pitching162;
    }

    //{"playerId":"531","firstName":"David","lastName":"Pearce","teamId":"632","pitchingOrder":"3","outs":"1","w":"0","l":"0","hld":"0","sv":"0","h":"7","r":"10","er":"10","hr":"0","ibb":"0","bb":"3","so":"0","hbp":"0","bk":"0","wp":"0","bf":"11","pit":"29","str":"10"}
    function AddPitchingStats(statLineTotal, statLineAdd) {
        statLineTotal.g = GetTotal(statLineTotal.g, statLineAdd.g);
        statLineTotal.w = GetTotal(statLineTotal.w, statLineAdd.w);
        statLineTotal.l = GetTotal(statLineTotal.l, statLineAdd.l);
        statLineTotal.gs = GetTotal(statLineTotal.gs, statLineAdd.gs);
        statLineTotal.gf = GetTotal(statLineTotal.gf, statLineAdd.gf);
        statLineTotal.cg = GetTotal(statLineTotal.cg, statLineAdd.cg);
        statLineTotal.sv = GetTotal(statLineTotal.sv, statLineAdd.sv);
        statLineTotal.outs = GetTotal(statLineTotal.outs, statLineAdd.outs);
        statLineTotal.h = GetTotal(statLineTotal.h, statLineAdd.h);
        statLineTotal.r = GetTotal(statLineTotal.r, statLineAdd.r);
        statLineTotal.er = GetTotal(statLineTotal.er, statLineAdd.er);
        statLineTotal.hr = GetTotal(statLineTotal.hr, statLineAdd.hr);
        statLineTotal.bb = GetTotal(statLineTotal.bb, statLineAdd.bb);
        statLineTotal.ibb = GetTotal(statLineTotal.ibb, statLineAdd.ibb);
        statLineTotal.so = GetTotal(statLineTotal.so, statLineAdd.so);
        statLineTotal.hbp = GetTotal(statLineTotal.hbp, statLineAdd.hbp);
        statLineTotal.bk = GetTotal(statLineTotal.bk, statLineAdd.bk);
        statLineTotal.wp = GetTotal(statLineTotal.wp, statLineAdd.wp);
        statLineTotal.bf = GetTotal(statLineTotal.bf, statLineAdd.bf);
        statLineTotal.pit = GetTotal(statLineTotal.pit, statLineAdd.pit);
        statLineTotal.str = GetTotal(statLineTotal.str, statLineAdd.str);
    }

    // G	W	L	GS	GF	CG	SV	IP	H	R	ER	HR	BB	IBB	K	HBP	BK	WP	BF	ERA	WHIP	K/9	BB/9	PIT	STR
    function DerivePitchingStats(statLine) {
        statLine.ip = Math.floor(Number(statLine.outs) / 3) + .1 * (Number(statLine.outs) % 3);
        statLine.era = (27 * Number(statLine.er) / Number(statLine.outs)).toFixed(2);
        statLine.whip = ((Number(statLine.h) + Number(statLine.bb)) / (Number(statLine.outs) / 3.0)).toFixed(2);
        statLine.k9 = (27.0 * Number(statLine.so) / Number(statLine.outs)).toFixed(2);
        statLine.bb9 = (27.0 * Number(statLine.bb) / Number(statLine.outs)).toFixed(2);
    }

    function CompilePitchingLogs(callingScope, logs) {
        var pitchingLog = {};
        for (index = 0; index < logs.length; index++) {
            var teamId = logs[index].teamId;
            if (!pitchingLog[teamId]) {
                pitchingLog[teamId] = {};
                pitchingLog[teamId].pitchingLines = [];
                pitchingLog[teamId].pitchingTotals = {};
            }
            var pitchingLine = logs[index];
            AddPitchingStats(pitchingLog[teamId].pitchingTotals, pitchingLine);
            DerivePitchingStats(pitchingLine); // For IP
            DerivePitchingStats(pitchingLog[teamId].pitchingTotals);
            pitchingLine.gameTime = new Date(pitchingLine.gameTime);
            // Add subfields to pitching line ERA WHIP K/9 BB/9
            pitchingLine.era = pitchingLog[teamId].pitchingTotals.era;
            pitchingLine.whip = pitchingLog[teamId].pitchingTotals.whip;
            pitchingLine.k9 = pitchingLog[teamId].pitchingTotals.k9;
            pitchingLine.bb9 = pitchingLog[teamId].pitchingTotals.bb9;
            if (pitchingLine.homeId == pitchingLine.teamId) {
                opponentName = dataFactory.getTeamName(pitchingLine.awayId);
                pitchingLine.opponent = "vs. " +opponentName;
            } else {
                opponentName = dataFactory.getTeamName(pitchingLine.homeId);
                pitchingLine.opponent = "@ " + opponentName;
            }
            pitchingLog[teamId].pitchingLines.push(pitchingLine);
        }
        callingScope.pitchingLog = pitchingLog;
    }

    // {"inning":"1","type":"top","runs":"4","hits":"2","errors":"0"}
    // hits and errors are not reported for recent game innings, so they are -1
    function ExtractLineScore(lineScoreArray) {
        var lineScore = {};
        var homeReported = false;
        var awayReported = false;
        lineScore.lastInning = 0;
        lineScore.awayRuns = [];
        lineScore.homeRuns = [];
        lineScore.awayRunTotal = undefined;
        lineScore.awayHitTotal = 0;
        lineScore.awayErrorTotal = 0;
        lineScore.homeRunTotal = undefined;
        lineScore.homeHitTotal = 0;
        lineScore.homeErrorTotal = 0;
        for (var i = 0; i < lineScoreArray.length; i++) {
            var lineItem = lineScoreArray[i];
            var inning = Number(lineItem.inning);
            if (inning > lineScore.lastInning) lineScore.lastInning = inning;
            if (lineItem.type == "top") {
                lineScore.awayRuns[inning - 1] = lineItem.runs;
                lineScore.awayRunTotal = lineScore.awayRunTotal ? lineScore.awayRunTotal + Number(lineItem.runs) : Number(lineItem.runs);
                lineScore.awayHitTotal += Number(lineItem.hits);
                lineScore.awayErrorTotal += Number(lineItem.errors);
                awayReported = true;
            } else {
                lineScore.homeRuns[inning - 1] = lineItem.runs;
                lineScore.homeRunTotal = lineScore.homeRunTotal ? lineScore.homeRunTotal + Number(lineItem.runs) : Number(lineItem.runs);
                lineScore.homeHitTotal += Number(lineItem.hits);
                lineScore.homeErrorTotal += Number(lineItem.errors);
                homeReported = true;
            }
        }
        // There may be missing innings all over the place, so fill them in:
        if (lineScore.lastInning == 0) lineScore.lastInning = 9;
        for (var inn = 0; inn < lineScore.lastInning; inn++) {
            if (lineScore.homeRuns[inn] == undefined) lineScore.homeRuns[inn] = homeReported ? "0" : "x";
            if (lineScore.awayRuns[inn] == undefined) lineScore.awayRuns[inn] = awayReported ? "0" : "x";
        }
        // Take care of case where home team did not bat in bottom of last inning
        if (lineScore.homeRuns[lineScore.lastInning - 1] == 0 && lineScore.homeRunTotal > lineScore.awayRunTotal) {
            lineScore.homeRuns[lineScore.lastInning - 1] = "x";
        }
        return lineScore;
    }

});