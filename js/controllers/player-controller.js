app.controller('playerController', function ($scope, $route, $routeParams, $location, dataFactory, authFactory, statFactory, scheduleFactory) {

    Utilities.log("Loading playerController...");
    $scope.controllerName = "playerController" // for batarang debugging
    $scope.controllerId = Math.floor((Math.random() * 10000) + 1); // for debugging
    $scope.objType = "$scope";

    $scope.callDebug = function () {
        // temp hook for setting breakpoint
        Utilities.log("...callDebug...");
    }

    // Link to season-dependent constants
    $scope.season = dataFactory.season;
    season = dataFactory.season;

    // Handles multiple displays, so figure out how we got here
    var page = "player";    // default if no specific page selected
    if ($location.path().search("/profile/draft/") >= 0) page = "draftProfile";
    if ($location.path().search("/playerAdmin") >= 0) page = "playerAdmin";
    if ($location.path().search("/player/season/") >= 0) page = "season";
    if ($location.path().search("/career") >= 0) page = "career";
    if ($location.path().search("/search") >= 0) page = "search";
    if ($location.path().search("/profile/freeAgent") >= 0) page = "freeAgentProfile";
    if ($location.path().search("/tryout") >= 0) page = "tryout";

    $scope.page = page;

    // ***** MOVE BACK TO BOTTOM WHEN DONE *****
    if (page == "freeAgentProfile") {

        if (!authFactory.login.loggedIn) {
            $location.path("/message/not-logged-in");
        }
        $scope.freeAgent = {};
        $scope.freeAgentProfile = {};
        $scope.claims = {};
        $scope.freeAgent.poolId = $routeParams.poolId;
        $scope.eligibleDivisions = {};
        //  Trying the GetRoles Div Comm: discriminator = "division", mask = 4
        $scope.user = {};
        authFactory.getRoles($scope.user, authFactory.login.userId);
        // console.log($scope.user);
        // $scope.freeAgent.eligibleGM = true;

        //  Claim Button Activation Variables
        $scope.isEligibleGMBool = false;
        $scope.eligibleTeams = [];
        $scope.divisionList = {}; // List of divisions
        $scope.gmTeam = {}; // List of teams user is on
        $scope.allClaimDataLoaded = 0;

        authFactory.getTeamList($scope.gmTeam, season.currentYear, authFactory.login.userId);
        dataFactory.getDivisions($scope.divisionList, season.currentYear);

        $scope.freeAgent.canEditProfile = authFactory.hasPermission("competition", season.currentYear, "Administrator");
        dataFactory.getFreeAgentProfile($scope.freeAgent, $scope.freeAgent.poolId);
        dataFactory.getFreeAgentClaims($scope.claims, $scope.freeAgent.poolId);

        $scope.eligibleDivision = function (divisionAge) {
            // Errors are showing up because these aren't defined until after load
            if ($scope.getPlayerAge($scope.freeAgent.player.birthDate) >= divisionAge) {
                return true;
            }
            else {
                return false;
            }
        }

        $scope.freeAgent.formatExperience = function (experience) {
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

        // ***** CLAIM Functions *****

        $scope.$watch(
            // This function returns the value being watched. It is called for each turn of the $digest loop
            function () { return $scope.divisionList.loadingData; },
            // This is the change listener, called when the value returned from the above function changes
            function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    // Only increment the counter if loadingData is false
                    if ($scope.divisionList.loadingData == false) {
                        $scope.allClaimDataLoaded = $scope.allClaimDataLoaded + 1;
                    }
                }
            }
        );
        $scope.$watch(
            function () { return $scope.gmTeam.loadingData; },
            function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    if ($scope.gmTeam.loadingData == false) {
                        $scope.allClaimDataLoaded = $scope.allClaimDataLoaded + 1;
                    }
                }
            }
        );
        $scope.$watch(
            function () { return $scope.freeAgent.loadingData; },
            function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    if ($scope.freeAgent.loadingData == false) {
                        $scope.allClaimDataLoaded = $scope.allClaimDataLoaded + 1;
                    }
                }
            }
        );
        $scope.$watch(
            function () { return $scope.claims.loadingData; },
            function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    if ($scope.claims.loadingData == false) {
                        $scope.allClaimDataLoaded = $scope.allClaimDataLoaded + 1;
                    }
                }
            }
        );
        $scope.$watch(
            function () { return $scope.allClaimDataLoaded; },
            function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    //  allClaimDataLoaded == 4 means Free Agent, divisions, GM Teams and claims are loaded - check if eligible
                    if ($scope.allClaimDataLoaded == 4) {
                        $scope.isEligibleGM();
                    }
                }
            }
        );

        $scope.isDivisionCommissioner = function () {
            for (var i = 0; i < $scope.user.roles.length; i++) {
                // console.log($scope.user.roles[i].discriminator);
                if ($scope.user.roles[i].discriminator == "division") {
                    return true;   
                }
            }
        }
        $scope.isAdmin = function () {
            return authFactory.login.isAdmin;
        }

        $scope.isEligibleGM = function () {
            //  Controls whether a user can place a claim or not
            //  Checks if the Teams a user is a GM for are in a division that the Free Agent is eligible to play in
            //  Iterate through list of teams user has GM privileges
            //  Iterate through list of divisions
            //  Check if team has already placed a claim

            //  For each team the user is a GM
            for (var i = 0; i < $scope.gmTeam.teams.length; i++) {
                //  For each division in the league
                for (var j = 0; j < $scope.divisionList.divisions.length; j++) {
                    //  If the gm team matches the current division
                    if ($scope.gmTeam.teams[i].division_id == $scope.divisionList.divisions[j].id) {
                        //  If the player is eligible for this division - the GM is eligible to claim
                        if ($scope.eligibleDivision($scope.divisionList.divisions[j].age)) {
                            if (!$scope.teamHasClaimed($scope.gmTeam.teams[i])) {
                                $scope.eligibleTeams.push($scope.gmTeam.teams[i]);
                                $scope.isEligibleGMBool = true;
                            }
                        }
                    }
                }

            }
        }

        $scope.teamHasClaimed = function (team) {
            //  For each team in claims list
            for (var j = 0; j < $scope.claims.claim.length; j++) {
                //  Iterate through claim list, only return true if a match is found
                if (team.team_id == $scope.claims.claim[j].teamId) {
                    // The team was found in the claim list
                    return true;
                }
            }
        }

        $scope.startClaim = function () {
            $scope.freeAgent.placingClaim = true;
        }

        $scope.placeClaim = function () {
            $scope.claim.free_agent_id = $scope.freeAgent.player.freeAgentId;
            authFactory.placeFreeAgentClaim($scope.claim, $scope.claim);
            $scope.freeAgent.placingClaim = false;
        }

        // When the claim returns, refresh the page
        $scope.$watch('claim.result', function (newValue, oldValue) {
            if (newValue && !oldValue) {
                if ($scope.claim.result.error) {
                    $scope.claim.error = $scope.claim.result.error;
                } else {
                    $route.reload();
                }
            }
        });

        $scope.cancelClaim = function () {
            $scope.freeAgent.placingClaim = false;
        }


        //  *****  Editing Profile Functions *****

        $scope.freeAgent.editProfile = function () {
            // Transfer data to form
            var form = {};
            var player = $scope.freeAgent.player;
            form.poolId = $scope.freeAgent.poolId;
            form.year = player.year;
            form.experience = player.experience;
            form.availability = player.availability;
            form.notes = player.notes;
            form.p = (player.p == "1");
            form.c = (player.c == "1");
            form.b1 = (player.b1 == "1");
            form.b2 = (player.b2 == "1");
            form.b3 = (player.b3 == "1");
            form.ss = (player.ss == "1");
            form.rf = (player.rf == "1");
            form.cf = (player.cf == "1");
            form.lf = (player.lf == "1");
            form.player_agent_notes = player.player_agent_notes;
            form.target_divisions = player.target_divisions;
            form.status = player.status;
            $scope.freeAgent.form = form;
            // Enable editing
            $scope.freeAgent.editSaved = false;
            $scope.freeAgent.editingInfo = true;
        }
        
        //  Have to diffrentiate between profile edit and status update
        //  Should move Approve/Edits into separate buttons/save functions
        $scope.statusChange = function () {
            $scope.freeAgent.form.statusChange = true;
        }


        $scope.freeAgent.cancelProfileEdit = function () {
            $scope.freeAgent.error = undefined;
            $scope.freeAgent.loadingData = false;
            $scope.freeAgent.editingInfo = false;
        }

        $scope.freeAgent.saveProfile = function () {
            authFactory.editFreeAgentProfile($scope.freeAgent, $scope.freeAgent.form);
        }
        // When the profile save returns, refresh the page
        $scope.$watch('freeAgent.result', function (newValue, oldValue) {
            if (newValue && !oldValue) {
                if ($scope.freeAgent.result.error) {
                    $scope.freeAgent.error = $scope.freeAgent.result.error;
                } else {
                    $route.reload();
                }
            }
        });

        $scope.freeAgent.startAwardClaim = function () {
            $scope.freeAgent.awardingClaim = true;
        }

        $scope.freeAgent.awardClaim = function () {
            // Need to send the claimId, user_id of player claimed and user_id of the claiming GM.
            // Can also get user_id of player on backend
            $scope.freeAgent.awarded.free_agent_id = $scope.freeAgent.poolId;
            
            $scope.freeAgent.awarded.userId = $scope.freeAgent.player.userId;
            $scope.freeAgent.awarded.email = $scope.freeAgent.player.email;
            $scope.freeAgent.awarded.name = $scope.freeAgent.player.firstName + " " + $scope.freeAgent.player.lastName;
            $scope.freeAgent.awarded.phone = $scope.freeAgent.player.phone;

            $scope.invite = {};
            $scope.invite.userId = 85;
            $scope.invite.email = $scope.freeAgent.player.email;
            $scope.invite.name = $scope.freeAgent.player.firstName + " " + $scope.freeAgent.player.lastName;


            for (var j = 0; j < $scope.claims.claim.length; j++){
                console.log($scope.claims.claim[j]);
                if ($scope.claims.claim[j].claimId == $scope.freeAgent.awarded.claim_id) {
                    $scope.freeAgent.awarded.gm_id = $scope.claims.claim[j].gmId;
                    $scope.invite.teamId = $scope.claims.claim[j].teamId;
                }
            }
            $scope.freeAgent.awarded.teamId = $scope.invite.teamId;
            authFactory.awardClaim($scope.freeAgent.awarded, $scope.freeAgent.awarded);
            var resend = false;
            authFactory.invitePlayer($scope.invite, $scope.invite.email, $scope.invite.name, $scope.invite.teamId, resend);
            $scope.freeAgent.awardingClaim = false;
        }

        // When the claim award returns, refresh the page
        $scope.$watch('freeAgent.awarded.result', function (newValue, oldValue) {
            if (newValue && !oldValue) {
                if ($scope.freeAgent.awarded.result.error) {
                    $scope.freeAgent.awarded.error = $scope.freeAgent.awarded.result.error;
                } else {
                    $route.reload();
                }
            }
        });

        $scope.freeAgent.cancelAwardClaim = function () {
            $scope.freeAgent.awardingClaim = false;
        }
    }


    // ***** MOVE BACK TO BOTTOM WHEN DONE *****

    if (page == "draftProfile") {

        if (!authFactory.login.loggedIn) {
            $location.path("/message/not-logged-in");
        }
        $scope.draft = {};
        $scope.draft.poolId = $routeParams.poolId;
        $scope.draft.canEditProfile = authFactory.hasPermission("competition", season.currentYear, "Administrator");
        // This is an easter egg to respond to a specific code to instead show a complete grid of bib photos
        if ($scope.draft.poolId == 9999) {
            $scope.draft.bibGrid = {}
            dataFactory.getDraftPlayers($scope.draft.bibGrid, $scope.season.currentYear, 0, -1);
        } else {
            dataFactory.getDraftProfile($scope.draft, $scope.draft.poolId);
        }

        $scope.draft.formatExperience = function (experience) {
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

        $scope.draft.getPlayerAge = function (birthDate) {
            var dob = new Date(birthDate)
            var today = new Date();
            return today.getFullYear() - dob.getUTCFullYear();
        }

        $scope.draft.is80Pct = function (player, type) {
            if ($scope.draft.player && $scope.draft.player.commitment == "1") {
                if (type == "style") return { color: 'green' };
                return "glyphicon glyphicon-ok";
            }
            if (type == "style") return { color: 'red' };
            return "glyphicon glyphicon-remove";
        }

        $scope.draft.vidSource = function (video) {
            return "https://pssbl-video.b-cdn.net/draft/" + $scope.draft.player.year + "/" + video;
        }

        $scope.draft.editDraftProfile = function () {
            // Transfer data to form
            var form = {};
            var player = $scope.draft.player;
            var positions = player.positions.split(" ");
            form.poolId = $scope.draft.poolId;
            form.year = player.year;
            form.position1 = "none";
            form.position2 = "none";
            form.position3 = "none";
            form.position4 = "none";
            form.position5 = "none";
            if (positions[0]) form.position1 = positions[0];
            if (positions[1]) form.position2 = positions[1];
            if (positions[2]) form.position3 = positions[2];
            if (positions[3]) form.position4 = positions[3];
            if (positions[4]) form.position5 = positions[4];
            form.experience = player.experience;
            form.availability = player.availability;
            form.notes = player.notes;
            form.available80 = (player.commitment == "1");
            form.drafted = (player.drafted == "1");
            $scope.draft.form = form;
            // Enable editing
            $scope.draft.editSaved = false;
            $scope.draft.editingInfo = true;
        }

        $scope.draft.cancelProfileEdit = function () {
            $scope.draft.error = undefined;
            $scope.draft.loadingData = false;
            $scope.draft.editingInfo = false;
        }

        $scope.draft.saveDraftProfile = function () {
            authFactory.editDraftProfile($scope.draft, $scope.draft.form);
        }

        // When the profile save returns, refresh the page
        $scope.$watch('draft.result', function (newValue, oldValue) {
            if (newValue && !oldValue) {
                if ($scope.draft.result.error) {
                    $scope.draft.error = $scope.draft.result.error;
                } else {
                    $route.reload();
                }
            }
        });
    
        // When the profile save returns, refresh the page
        $scope.$watch('draft.bibGrid', function (newValue, oldValue) {
            if (newValue && !oldValue) {
                if ($scope.draft.result.error) {
                    $scope.draft.error = $scope.draft.result.error;
                } else {
                    $route.reload();
                }
            }
        });
    }

    // Separate out season log, since this is a different html page
    if (page == "season") {

        $scope.season = {};
        $scope.season.playerId = $routeParams.playerId;
        $scope.season.year = $routeParams.year;
        $scope.season.teamTabs = {};
        $scope.season.battingLog = null;
        $scope.season.pitchingLog = null;
        $scope.season.yearLoaded = undefined;

        dataFactory.loadTeamNames($scope.season, $scope.season.year);
        dataFactory.getPlayerName($scope.season, $scope.season.playerId);

        $scope.season.splitTeamName = function (teamName) {
            // This may get called before teamName is set, so only process if
            // teamName is defined
            if (teamName) {
                var splitName = teamName.split(" ");
                var returnString = splitName[1];
                if (splitName.length > 2) returnString += "-" + splitName[2];
                returnString += "/" + splitName[0];
                return returnString;
            }
        }

        $scope.season.showTeamTab = function (teamId) {
            $scope.season.teamId = teamId;
            $scope.season.teamName = $scope.season.teamTabs[teamId];
        }

        $scope.season.hasBattingLogs = function () {
            return ($scope.season.battingLog && $scope.season.battingLog[$scope.season.teamId] && $scope.season.battingLog[$scope.season.teamId].battingLines.length > 0);
        }

        $scope.season.hasPitchingLogs = function () {
            return ($scope.season.pitchingLog && $scope.season.pitchingLog[$scope.season.teamId]);
        }

        $scope.season.isPlayoff = function (logLine) {
            return (logLine && logLine.playoffRound && (Number(logLine.playoffRound) > 0)) ? "playoff-line" : "";
        }

        // For Game Logs, loading should wait until loadTeamNames is complete
        // Watches need to be set before initiating the calls or it might be too late
        // Also, can't rely on newValue and oldValue being different, for some reason TODO: why?
        $scope.$watch('season.yearLoaded', function (newValue, oldValue) {
            if (newValue && newValue == $scope.season.year) {
                statFactory.getBattingLog($scope.season, $scope.season.playerId, $scope.season.year);
                statFactory.getPitchingLog($scope.season, $scope.season.playerId, $scope.season.year);
            }
        });

        // When the queries return, we need to update the team tabs
        $scope.$watch('season.battingLog', function (newValue, oldValue) {
            if (newValue && !oldValue) {
                AddTabs($scope.season.battingLog);
            }
        });

        $scope.$watch('season.pitchingLog', function (newValue, oldValue) {
            if (newValue && !oldValue) {
                AddTabs($scope.season.pitchingLog);
            }
        });
    }

    if (page == "player") {

        // Could get here for one of three tabs
        // on player.html: career stats, profile, or personal schedule
        $scope.player = {};

        // need this to access some schedule functions
        $scope.schedule = scheduleFactory.schedule;

        // Initialize variables - Single player
        $scope.player.id = $routeParams.playerId;
        $scope.player.year = $routeParams.year;
        if (!$scope.player.year) $scope.player.year = season.currentYear;
        $scope.player.playerName = "Unknown";
        $scope.player.loadingData = false;

        // To be loaded
        $scope.player.careerBattingStats = null;
        $scope.player.careerPitchingStats = null;
        $scope.player.careerBattingTotals = null;
        $scope.player.careerPitchingTotals = null;
        $scope.player.careerBattingAve = null;
        $scope.player.careerPitchingAve = null;

        // Schedule pagination
        $scope.itemsPerPage = 20;
        $scope.currentPage = 1;
        $scope.maxPages = 8;

        // Need to review how this can be handled by schedule controller
        $scope.setPerPage = function (value) {
            $scope.itemsPerPage = value;
            $scope.currentPage = 1;
            if ($scope.player.tabSelected == "Schedule") GetPlayerSchedule();
            if ($scope.itemsPerPage < 0) {
                $scope.itemsPerPage = $scope.gameCount;
            }
        }

        $scope.pageChanged = function (page) {
            Utilities.log("Calling player:pageChanged");
            $scope.currentPage = page;
            if ($scope.player.tabSelected == "Schedule") GetPlayerSchedule();
        }

        $scope.player.showTab = function (tabName) {
            if (tabName == "Profile") {
                GetPlayerProfile();
                $scope.player.activeTab = 0;
            }
            if (tabName == "Career") {
                GetPlayerCareer();
                $scope.player.activeTab = 1;
            }
            if (tabName == "Schedule") {
                GetPlayerSchedule();
                $scope.player.activeTab = 2;
            }
            $scope.player.tabSelected = tabName;
        }

        dataFactory.getPlayerName($scope.player, $scope.player.id);

        if ($location.path().search("/player/schedule/") >= 0) {
            $scope.player.showTab("Schedule");
        } else if ($location.path().search("/player/profile/") >= 0) {
            $scope.player.showTab("Profile");
        } else {
            $scope.player.showTab("Career");
        }

        // Different data calls for different tabs

        function GetPlayerSchedule() {
            scheduleFactory.getGameCount($scope, {
                year: $scope.player.year,
                playerId: $scope.player.id,
            });
            scheduleFactory.getGames($scope, {
                year: $scope.player.year,
                playerId: $scope.player.id,
                scheduleType: "player",
                page: ($scope.currentPage - 1),
                perPage: $scope.itemsPerPage
            });
        }

        function GetPlayerCareer() {
            statFactory.getCareerBattingStats($scope.player, $scope.player.id);
            statFactory.getCareerPitchingStats($scope.player, $scope.player.id);
        }

        function GetPlayerProfile() {

        }

        $scope.player.hasBattingStats = function () {
            return ($scope.player.careerBattingStats && $scope.player.careerBattingStats.length > 0);
        }

        $scope.player.hasPitchingStats = function () {
            return ($scope.player.careerPitchingStats && $scope.player.careerPitchingStats.length > 0);
        }
    }

    if (page == "playerAdmin") {

        // Initialize variables - Single player
        $scope.playerAdmin = {};
        $scope.playerAdmin.year = $routeParams.year;
        if (!$scope.playerAdmin.year) $scope.playerAdmin.year = season.currentYear;
        $scope.playerAdmin.playerId = $routeParams.playerId;
        if ($scope.playerAdmin.playerId) {
            $scope.playerAdmin.type = "Status";
            authFactory.getPlayerName($scope.playerAdmin, $scope.playerAdmin.playerId);
            authFactory.getTeamList($scope.playerAdmin, $scope.playerAdmin.year, $scope.playerAdmin.playerId);
            $scope.playerAdmin.league = {};
            authFactory.getAllTeams($scope.playerAdmin.league);
            $scope.playerAdmin.activeTab = 1;
            $scope.playerAdmin.registration = {};
            authFactory.getRegistrationEvents($scope.playerAdmin, $scope.playerAdmin.year, $scope.playerAdmin.playerId);
        } else {
            $scope.playerAdmin.type = "Select";
            $scope.playerAdmin.playerName = "(No Player Selected)";
        }
        $scope.playerAdmin.registrationId = $routeParams.registrationId;
        $scope.playerAdmin.loadingData = false;
 
        // Query function to find a player
        // TODO: Redundant with admin player billing: perhaps player query should be made a directive.
        $scope.playerAdmin.submitPlayerQuery = function (playerId, playerFirstName, playerLastName, playerEmail, searchType) {
            authFactory.getPlayerSearch($scope.playerAdmin, playerId, playerFirstName, playerLastName, playerEmail, searchType);
        };

        // Clear previous results when selectors changed
        $scope.playerAdmin.clearQuery = function () {
            $scope.playerAdmin.searchResults = null;
        };

        // Clear previous results when selectors changed
        $scope.playerAdmin.emptyResults = function () {
            if ($scope.playerAdmin.searchResults && $scope.playerAdmin.searchResults.length == 0) return true;
            return false;
        };

        $scope.playerAdmin.showType = function (type) {
            $scope.playerAdmin.type = type;
        }

        $scope.playerAdmin.isActive = function (status) {
            return (status == 'Active');
        }

        $scope.playerAdmin.priorSeason = function () {
            if ($scope.playerAdmin.type == "Select") return false;
            if ($scope.playerAdmin.year == season.currentYear) return false;
            return true;
        }

        $scope.playerAdmin.statusClass = function (status) {
            if (status == "Active") return "label-success";
            return "label-default";
        }

        $scope.playerAdmin.removeFromRoster = function (team) {
            authFactory.removeFromRoster($scope.playerAdmin, $scope.playerAdmin.playerId, team.team_id);
        }

        $scope.playerAdmin.removeFromDraft = function (team) {
            authFactory.removeFromDraft($scope.playerAdmin, $scope.playerAdmin.playerId, $scope.playerAdmin.year);
        }

        $scope.playerAdmin.makeInactive = function (team) {
            // deactivate player but do not send announcement mail
            authFactory.deactivate($scope.playerAdmin, $scope.playerAdmin.playerId, team.team_id, false);
        }
  
        $scope.playerAdmin.changeTeam = function (team) {
            team.transferActive = true;
            PopulateTeamList($scope.playerAdmin.league, team);
        }

        $scope.playerAdmin.transferPlayer = function (fromId, toId) {
            authFactory.transferPlayer($scope.playerAdmin, $scope.playerAdmin.playerId, fromId, toId);
        }

        // Activate a watch function for when the registration data finishes loading
        // Here, we are only using this to determine if player is registered for draft
        $scope.$watch('playerAdmin.registrationEventsLoaded', function (newValue, oldValue) {
            if (newValue && newValue != oldValue) {
                // Go through events, assign icons and reformat comments to html.
                $scope.playerAdmin.registeredForDraft = false;
                for (var iEvent = 0; iEvent < $scope.playerAdmin.registration.events.length; iEvent++) {
                    var event = $scope.playerAdmin.registration.events[iEvent];
                    if (event.type == "player_pool") {
                        $scope.playerAdmin.registeredForDraft = true;
                    }
                }
            }
        });

        // Detect success or failure from any of the update functions. All are handled uniformly
        $scope.$watch('playerAdmin.deactivateResult', function (newValue, oldValue) {
            HandleServerResult(newValue, oldValue);
        });

        $scope.$watch('playerAdmin.removeFromRosterResult', function (newValue, oldValue) {
            HandleServerResult(newValue, oldValue);
        });

        $scope.$watch('playerAdmin.removeFromDraftResult', function (newValue, oldValue) {
            HandleServerResult(newValue, oldValue);
        });

        $scope.$watch('playerAdmin.transferPlayerResult', function (newValue, oldValue) {
            HandleServerResult(newValue, oldValue);
        });

    }

    if (page == "career") {

        // Initialize variables - Career Stats Search
        $scope.career = {};
        $scope.career.search = {};
        $scope.career.search.type = "Career";
        $scope.career.search.scope = "League";
        $scope.career.search.year = null;
        $scope.career.search.division = null;
        $scope.career.search.team = null;
        $scope.career.search.category = "Batting";
        $scope.career.battingStatLabels = ["Games", "Plate Appearances", "At Bats", "Runs", "Hits", "Doubles", "Triples", "Home Runs", "Runs Batted In", "Stolen Bases", "Caught Stealing", "Walks", "Strikeouts", "Batting Average", "On Base Percentage", "Slugging Percentage", "OPS", "Total Bases", "Hit By Pitch", "Sacrifice Bunts", "Sacrifice Flies"];
        $scope.career.battingStats = ["g", "pa", "ab", "r", "h", "2b", "3b", "hr", "rbi", "sb", "cs", "bb", "so", "avg", "obp", "slg", "ops", "tb", "hbp", "sh", "sf"];
        // G	W	L	GS	GF	CG	SV	IP	H	R	ER	HR	BB	K	HBP	BK	WP	BF	ERA	WHIP	K/9	BB/9	PIT	STR
        $scope.career.pitchingStatLabels = ["Games", "Wins", "Losses", "Starts", "Complete Games", "Shutouts", "Saves", "Innings Pitched", "Hits", "Runs", "Earned Runs", "Home Runs Allowed", "Walks", "Strikeouts", "Hit By Pitch", "Balks", "Wild Pitches", "ERA", "WHIP", "K / 9 Inn", "BB / 9 Inn"];
        $scope.career.pitchingStats = ["g", "w", "l", "gs", "cg", "sho", "sv", "ip", "h", "r", "er", "hr", "bb", "so", "hbp", "bk", "wp", "era", "whip", "k9", "bb9"];
        $scope.career.statLabels = $scope.career.battingStatLabels;
        $scope.career.stats = $scope.career.battingStats;
        $scope.career.results = [];
        $scope.career.search.stat = "13"; // Batting Average
        $scope.career.playerCount = 100;
        $scope.career.currentPage = 1;
        $scope.career.itemsPerPage = 25;
        $scope.career.years = [];
        scheduleFactory.getYears($scope.career);
        $scope.career.divisions = [];
        $scope.career.teams = [];
        $scope.career.teamList = [];
        dataFactory.getDivisionNames($scope.career);

        $scope.career.setType = function () {
            var type = $scope.career.search.type;
            $scope.career.search.scope = "League"
            $scope.career.setScope();
            $scope.career.search.restrict = null;
            if (type == "Season") $scope.career.search.restrict = "All"
        }

        $scope.career.setScope = function () {
            var scope = $scope.career.search.scope;
            if (scope == "League") {
                $scope.career.search.year = null;
                if ($scope.career.search.type == "Year") $scope.career.search.year = $scope.career.years[0].toString();
                $scope.career.search.division = null;
                $scope.career.search.teamId = undefined;
            } else if (scope == "Division") {
                $scope.career.search.year = null;
                $scope.career.search.division = $scope.career.divisions[0];
                $scope.career.search.teamId = undefined;
            } else if (scope == "Franchise") {
                $scope.career.search.year = $scope.career.years[0].toString();
                $scope.career.setYear();
                $scope.career.search.restrict = null;
            }
            $scope.career.results = [];
        }

        $scope.career.setCategory = function () {
            if ($scope.career.search.category == "Batting") {
                $scope.career.statLabels = $scope.career.battingStatLabels;
                $scope.career.stats = $scope.career.battingStats;
                $scope.career.search.stat = "13"; // Batting Average
            } else {
                $scope.career.statLabels = $scope.career.pitchingStatLabels;
                $scope.career.stats = $scope.career.pitchingStats;
                $scope.career.search.stat = "17"; // ERA
            }
            $scope.career.results = [];
        }

        $scope.career.setYear = function () {
            // If this is a franchise search, need to load pertinent divisions adn team names
            if ($scope.career.search.scope == "Franchise") {
                dataFactory.getAllTeams($scope.career, $scope.career.search.year);
            }
            $scope.career.results = [];
        }

        $scope.career.setDivision = function () {
            if ($scope.career.search.scope == "Franchise") {
                // Load up teams matching the division
                var teamList = [];
                var teams = $scope.career.teams;
                for (var i = 0; i < teams.length; i++) {
                    var team = teams[i];
                    if (team.division == $scope.career.search.division) {
                        var addTeam = {}
                        addTeam.name = team.teamName;
                        addTeam.id = team.teamId;
                        teamList.push(addTeam);
                    }
                }
                $scope.career.teamList = teamList;
                $scope.career.search.teamId = teamList[0].id;
            }
            $scope.career.results = [];
        }

        $scope.career.clearResults = function () {
            $scope.career.results = [];
        }

        $scope.career.showTable = function (tableName) {
            if (tableName == "Batting") {
                return (($scope.career.search.category == "Batting") && ($scope.career.results) && ($scope.career.results.length > 0));
            } else if (tableName == "Pitching") {
                return (($scope.career.search.category == "Pitching") && ($scope.career.results) && ($scope.career.results.length > 0));
            }
        }

        $scope.career.setPerPage = function (value) {
            $scope.career.itemsPerPage = value;
            $scope.career.currentPage = 1;
        }

        $scope.pageChanged = function (page) {
            $scope.career.currentPage = page;
        }

        $scope.career.inRange = function (index, currentPage, statLine) {
            if (Number(index) < Number(currentPage - 1) * Number($scope.career.itemsPerPage)) return false;
            if (Number(index) >= Number(currentPage) * Number($scope.career.itemsPerPage)) return false;
            return true;
        }

        $scope.career.isSortColumn = function (key) {
            if (key == $scope.career.stats[Number($scope.career.search.stat)]) {
                return "sorted-col";
            } else if ($scope.career.hideColumns) {
                return "hide";
            }
        }

        $scope.career.getPlayerName = function (statLine) {
            return statLine.firstName + " " + statLine.lastName;
        }

        $scope.career.searchStats = function () {
            if ($scope.career.search.category == "Batting") {
                statFactory.getCareerBattingLeaders($scope.career, $scope.career.search);
            } else if ($scope.career.search.category == "Pitching") {
                statFactory.getCareerPitchingLeaders($scope.career, $scope.career.search);
            }
            $scope.career.currentPage = 1;
        }

        $scope.career.constructTitle = function () {
            var type = $scope.career.search.type;
            var title = "(Undefined)";
            var statName = $scope.career.statLabels[Number($scope.career.search.stat)];
            // Remove plurals - a few special cases
             if (statName.substr(statName.length - 1, 1) == "s") {
                statName = statName.substr(0, statName.length - 1);
            }
            statName = statName.replace("Flie", "Fly");
            statName = statName.replace("Losse", "Loss");
            statName = statName.replace("Pitche", "Pitch");
            if (type == "Career") {
                title = "Career " + statName + " Leaders";
            } else if (type == "FiveYear") {
                title = "Five Year " + statName + " Leaders";
            } else if (type == "Season") {
                title = "Single Season " + statName + " Records";
            } else if (type == "Year") {
                title = $scope.career.search.year + " " + statName + " Leaders";
            }

            // Add franchise name, if specified
            if ($scope.career.search.scope == "Franchise") {
                title += " (Franchise)";
            }
            // Add division name, if specified
            if ($scope.career.search.scope == "Division") {
                title += " (" + $scope.career.search.division + " Division)";
            }
            return title;
        }

        // In franchise mode, need to wait for division and team names to load
        // that match the specified year. These will be in teams object
        $scope.$watch('career.gotTeams', function (newValue, oldValue) {
            if (newValue && newValue != oldValue) {
                // load up selectors
                var teams = $scope.career.teams;
                var lastDivision = "";
                $scope.career.divisions = [];
                for (var i = 0; i < teams.length; i++) {
                    var team = teams[i];
                    if (team.division != lastDivision) {
                        $scope.career.divisions.push(team.division);
                        lastDivision = team.division;
                    }
                }
                $scope.career.search.division = $scope.career.divisions[0];
                $scope.career.setDivision();
            }
        });
    }

    if (page == "search") {

        // Initialize variables - Player Search
        $scope.search = {};
        $scope.search.playerFirstName = "";
        $scope.search.playerLastName = "";

        // Query function to find a player
        // TODO: Redundant with admin player billing: perhaps player query should be made a directive.
        $scope.search.submitPlayerQuery = function () {
            authFactory.getPlayerSearch($scope.search, undefined, $scope.search.playerFirstName, $scope.search.playerLastName, null, "Tryout");
        };

        // Clear previous results when selectors changed
        $scope.search.emptyResults = function () {
            if ($scope.search.searchResults && $scope.search.searchResults.length == 0) return true;
            return false;
        };

    }

    if (page == "tryout") {

        $scope.tryout = {};
        // Must have permission to access this. Currently associated with "Treasurer" permissions at the season level
        // as logged in user, so extraneous for now. Admin access will be added later
        if (!authFactory.hasPermission("competition", season.currentYear, "Treasurer")) {
            $location.path("/message/not-authorized");
        } else {
            // Initialize variables - Player tryout (paperless registration)
            $scope.tryout.playerFirstName = "";
            $scope.tryout.playerLastName = "";
            $scope.tryout.adminName = authFactory.login.userName;
            $scope.tryout.adminId = authFactory.login.userId;
            $scope.master.fullScreen = true;
            $scope.tryout.page = "Select";
            $scope.tryout.step = 1;
            $scope.tryout.stepStatus = [];
            $scope.tryout.stepStatus[1] = "Identify Player";
            $scope.tryout.stepStatus[2] = "Create or Verify Account";
            $scope.tryout.stepStatus[3] = "Provide Draft Information";
            $scope.tryout.stepStatus[4] = "Submit Photo and Bib Number";
            $scope.tryout.bibNumber = "";
            $scope.tryout.pinCode = "";
            $scope.tryout.pinMatch = (authFactory.login.userId ^ 3456).toString();
            $scope.tryout.pinMask = "";
        }

        // Set up registration of new player
        $scope.tryout.newPlayer = function () {
            $scope.tryout.type = "New";
            $scope.tryout.stepStatus[1] = "Identify Player - New Player";
            $scope.tryout.step = 2;
            $scope.tryout.page = "Create";
        }

        // Query function to find a player - only by name
        $scope.tryout.submitPlayerQuery = function () {
            authFactory.getPlayerSearch($scope.tryout, undefined, $scope.tryout.playerFirstName, $scope.tryout.playerLastName, null, "Tryout");
        };

        // Clear previous results when selectors changed
        $scope.tryout.emptyResults = function () {
            if ($scope.tryout.searchResults && $scope.tryout.searchResults.length == 0) return true;
            return false;
        };

        // Update process when existing player selected
        $scope.tryout.selectPlayer = function (result) {
            // if the player has already registered for the draft, skip ahead to last step
            $scope.tryout.setPlayerInfo(result);
            $scope.tryout.stepStatus[1] = "Identify Player - " + result.firstName + " " + result.lastName;
            $scope.tryout.stepStatus[2] = "Create or Verify Account - Account Verified";
            $scope.tryout.draftRegistrationId = result.draftRegistrationId;
            if (result.draftRegistrationId > 0) {
                $scope.tryout.step = 4;
                $scope.tryout.stepStatus[3] = "Provide Draft Information - Player pre-registered for draft";
                $scope.tryout.page = "Submit";
            } else {
                $scope.tryout.step = 3;
                $scope.tryout.stepStatus[3] = "Provide Draft Information - Filling out form";
                $scope.tryout.page = "Form";
            }
        };

        $scope.tryout.setPlayerInfo = function (result) {
            $scope.tryout.playerFirstName = result.firstName;
            $scope.tryout.playerLastName = result.lastName;
            $scope.tryout.playerName = result.firstName + " " + result.lastName;
            $scope.tryout.playerBirthDate = result.birthDate;
            $scope.tryout.playerId = result.playerId;
        }

        // Clear previous results when selectors changed
        $scope.tryout.exitForm = function () {
            $scope.master.fullScreen = false;
            authFactory.logout($scope.tryout);
            $location.path("/login");
        };

        // Clear previous results when selectors changed
        $scope.tryout.reloadPage = function () {
            $route.reload();
        };

        // Wiaver handling just cut/pasted/edited from admin-controller - clean up some day
        $scope.tryout.showWaiver = function () {
            $scope.tryout.page = "Waiver";
            $scope.tryout.form = {};
            $scope.tryout.form.signature = "";
            dataFactory.getArticleHtml($scope, "waiver")
        }

        $scope.tryout.signWaiver = function (signed) {
            if (signed) {
                if ($scope.tryout.form.signature === $scope.tryout.playerName) {
                    $scope.tryout.form.signatureError = false;
                    $scope.tryout.waiver = true;
                    $scope.tryout.page = "Form";
                } else {
                    $scope.tryout.form.signatureError = true;
                }
            } else {
                $scope.tryout.form.signatureError = false;
                $scope.tryout.page = "Form";
            }
        }

        $scope.tryout.submitDraft = function () {
            // Fill in some addition required info
            $scope.tryout.form.userId = $scope.tryout.playerId;
            $scope.tryout.form.adminId = authFactory.login.userId;
            $scope.tryout.form.year = season.currentYear
            authFactory.registerDraft($scope.tryout, $scope.tryout.form);
            $scope.tryout.submitted = true;
        }

        $scope.tryout.addBibDigit = function (digit) {
            if ($scope.tryout.bibNumber.length < 4) $scope.tryout.bibNumber += digit.toString();
        }

        $scope.tryout.clearBibDigits = function () {
            $scope.tryout.bibNumber = "";
        }

        $scope.tryout.addPinDigit = function (digit) {
            if ($scope.tryout.pinCode.length < 4) {
                $scope.tryout.pinCode += digit.toString();
                $scope.tryout.pinMask += "*";
            }
        }

        $scope.tryout.clearPinDigits = function () {
            $scope.tryout.pinCode = "";
            $scope.tryout.pinMask = "";
        }

        var preview = document.getElementById('preview');
        var capture = document.getElementById('capture');

        $scope.tryout.handleFiles = function(files) {
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                var imageType = /^image\//;

                if (!imageType.test(file.type)) {
                    continue;
                }

                var img = document.createElement("img");
                img.classList.add("obj");
                img.file = file;
                preview.appendChild(img); // Assuming that "preview" is the div output where the content will be displayed.

                var reader = new FileReader();
                reader.onload = (function (aImg) { return function (e) { aImg.src = e.target.result; }; })(img);
                reader.readAsDataURL(file);
            }
        }

        $scope.tryout.clickUpload = function () {
            var hidden = document.getElementById('upload')
            hidden.click();
        };

        $scope.tryout.uploadBibAndPhoto = function () {
            // Photo not working yet, bypass until fixed
            $scope.tryout.photo = {};
            authFactory.uploadTryoutInfo($scope.tryout, $scope.tryout.adminId, $scope.tryout.draftRegistrationId, $scope.tryout.bibNumber, $scope.tryout.photo);
            // Wait until success or failure
        }

        // Submit Account code is duplicated from admin-controller: should clean up at a later time
    
        // Function called when create account button is clicked
        $scope.tryout.submitAccount = function () {
            if (ValidateCreateAccountForm()) {
                $scope.tryout.signup.token = "tryout";  // instead of validating token, will authenticate credentials.
                authFactory.createAccount($scope.tryout.signup);
            }
        }

        // TODO - use more automated validation, but this is a 
        // quick first cut.
        function ValidateCreateAccountForm() {
            var signup = $scope.tryout.signup;
            signup.account = {};
            signup.contact = {};
            signup.account.errorText = false;
            signup.contact.errorText = false;
            if (!signup.firstName) ReportFormError(signup.account, "You must provide your first name");
            if (!signup.lastName) ReportFormError(signup.account, "You must provide your last name");
            if (!ValidateEmail(signup.email)) ReportFormError(signup.account, "Not a vaild email address");
            if (!signup.password || signup.password.length < 6) ReportFormError(signup.account, "Password must be at least 6 characters");
            if (!signup.password || !signup.password2 || signup.password != signup.password2) ReportFormError(signup.account, "Passwords do not match");
            if (!signup.date) {
                ReportFormError(signup.account, "Date of Birth is required");
            } else if (!Utilities.isValidDate(signup.date)) {
                ReportFormError(signup.account, "Please enter date as MM/DD/YYYY");
            } else {
                signup.dob = signup.date.substr(6, 4) + "-" + signup.date.substr(0, 2) + "-" + signup.date.substr(3, 2);
                // need to verify applicant is at least 18
                var yearPlus18 = parseInt(signup.date.substr(6, 4)) + 18;
                var eligible = yearPlus18.toString() + "-" + signup.date.substr(0, 2) + "-" + signup.date.substr(3, 2);
                var eligibleDate = new Date(eligible);
                var today = new Date();
                if (eligibleDate > today) {
                    ReportFormError(signup.account, "You must be at least 18 years old");
                }
            }
            if (!signup.address || signup.address.length < 5) ReportFormError(signup.contact, "Address must be at least 5 characters");
            if (!signup.city || signup.city.length < 3) ReportFormError(signup.contact, "City must be at least 3 characters");
            if (!signup.state || signup.state.length != 2) ReportFormError(signup.contact, "Please enter a 2 letter state abbreviation");
            if (!signup.zip || signup.zip < 10000) ReportFormError(signup.contact, "Zip code must be at least 5 digits");
            if (!signup.phone || signup.phone.length < 10) ReportFormError(signup.contact, "Please specify a full phone number with area code");
            return (!signup.account.errorText && !signup.contact.errorText);
        }

        function ReportFormError(formSection, errorText) {
            if (!formSection.errorText) {
                formSection.errorText = errorText;
            } else {
                formSection.errorText += "<br />" + errorText;
            }
        }

        function ValidateEmail(email) {
            var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            return re.test(String(email).toLowerCase());
        }

        // When the createAccount call returns, indicate success or failure
        $scope.$watch('tryout.signup.createResult', function (newValue, oldValue) {
            if (newValue && newValue != oldValue) {
                var createResult = $scope.tryout.signup.createResult;
                if (createResult.result == "success") {
                    // if the player has already registered for the draft, skip ahead to last step
                    $scope.tryout.setPlayerInfo(createResult);
                    $scope.tryout.stepStatus[1] = "Identify Player - New Player";
                    $scope.tryout.stepStatus[2] = "New Account Created For: " + createResult.firstName + " " + createResult.lastName;
                    $scope.tryout.step = 3;
                    $scope.tryout.stepStatus[3] = "Provide Draft Information - Filling out form";
                    $scope.tryout.page = "Form";
                } else {
                    $scope.tryout.error = createResult.error;
                    $scope.tryout.page = "Error";
                }
            }
        });

        // When the profile save returns, refresh the page
        $scope.$watch('tryout.result', function (newValue, oldValue) {
            if (newValue && !oldValue) {
                var result = $scope.tryout.result;
                if (result.error) {
                    $scope.tryout.error = result.error;
                    $scope.tryout.page = "Error";
                } else if (!result.draft_registration_id || result.draft_registration_id <= 0) {
                    $scope.tryout.error = "Invalid draft registration id returned";
                    $scope.tryout.page = "Error";
                } else {
                    $scope.tryout.draftRegistrationId = result.draft_registration_id;
                    $scope.tryout.page = "Submit";
                }
            }
        });

        // When the upload returns, complete the process
        $scope.$watch('tryout.uploadTryoutResult', function (newValue, oldValue) {
            if (newValue && !oldValue) {
                var result = $scope.tryout.uploadTryoutResult;
                if (result.error) {
                    $scope.tryout.error = result.error;
                    $scope.tryout.page = "Error";
               } else {
                    $scope.tryout.page = "Confirm";
               }
            }
        });


    }

    // Local functions
    function AddTabs(logObject) {
        for (teamId in logObject) {
            if (!$scope.season.teamTabs[teamId]) {
                $scope.season.teamTabs[teamId] = dataFactory.getTeamDivision(teamId) + " " + dataFactory.getTeamName(teamId);
            }
        }
    }

    function PopulateTeamList(league, team) {
        // For a given team, enumerate the other teams in the same division
        var teamList = [];
        for (var otherTeamIndex in league.teams) {
            var otherTeam = league.teams[otherTeamIndex];
            if (otherTeam.divisionId == team.division_id && otherTeam.teamId != team.team_id) {
                teamList.push(otherTeam);
            }
        }
        team.transferList = teamList;
        $scope.playerAdmin.destinationTeam = teamList[0].teamId;
    }

    function HandleServerResult(newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            // If successful, reload page
            if (newValue.result == "success") {
                $route.reload();
                // Otherwise, show error returned
            } else {
                $scope.playerAdmin.error = "Operation Failed: " + newValue.error;
            }
        }
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

});