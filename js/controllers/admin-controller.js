app.controller('adminController', function ($scope, $route, $routeParams, $location, authFactory, dataFactory, scheduleFactory) {

    Utilities.log("Loading adminController...");
    $scope.controllerName = "adminController" // for batarang debugging
    $scope.controllerId = Math.floor((Math.random() * 10000) + 1); // for debugging
    $scope.objType = "$scope";

    $scope.callDebug = function () {
        // temp hook for setting breakpoint
        Utilities.log("...callDebug...");
    }

    // This controller handles admin functions as well as new player
    // and draft registration
    $scope.admin = authFactory.admin;
    $scope.login = authFactory.login;
    $scope.draft = authFactory.draft;
    $scope.freeAgent = authFactory.freeAgent;
    $scope.registration = authFactory.registration;
    // Link to season-dependent constants
    $scope.season = dataFactory.season;
    season = dataFactory.season;

    // Can get here from multiple links ... depending on the path, some
    // initialization may be required
    var page = "";    // default if no specific page selected
    if ($location.path().search("/signup") >= 0) page = "signup";
    if ($location.path().search("/invite") >= 0) page = "invite";
    if ($location.path().search("/admin") >= 0) page = "admin";
    if ($location.path().search("/draft") >= 0) page = "draft";
    if ($location.path().search("/freeAgent") >= 0) page = "freeAgent";
    if ($location.path().search("/mail") >= 0) page = "mail";
    if ($location.path().search("/playoffs") >= 0) page = "playoffs";
    if ($location.path().search("/support") >= 0) page = "support";
    if ($location.path().search("/admin/taxi") >= 0) page = "taxi";
    if ($location.path().search("/team") >= 0) page = "team";   // supercedes admin

    // ======================================
    // === Initialization for signup page ===
    // === New user is requesting account ===
    // === Or creating based on email     ===
    // ======================================
    if (page == "signup") {
        $scope.signup = authFactory.signup;
        authFactory.signup.OkToSignup = true;   // Temporary override (set false to disable)
        $scope.signup.token = $routeParams.token;
        $scope.signup.email = $routeParams.email;
        $scope.signup.objType = "signup";
        $scope.signup.adminRequest = false;
        $scope.signup.state = "WA";
        // Technically, it should only be both or neither specified, but handle any case
        // in which both are not specified as if neither is specified.
        if (($scope.signup.token === undefined) || ($scope.signup.email === undefined)) {
            // Require button to be pushed rather than direct navigation - defer
            if (!authFactory.signup.OkToSignup) {
                $scope.signup.errorTitle = "Signup Not Available";
                $scope.signup.errorText = "Signing up for new accounts is temporarilly suspended";
                $scope.signup.page = "ErrorMessage";
            } else {
                $scope.signup.page = "RequestAccount";
            }
        } else {
            $scope.signup.email = decodeURIComponent($routeParams.email);
            $scope.signup.teamId = null;
            $scope.signup.page = "Loading";
            // When this returns, $scope.signup.validateResult watch will fire
            authFactory.validateToken($scope.signup, $scope.signup.email, $scope.signup.teamId, $scope.signup.token);
        }

        // Check if user has permission to request account on behalf of someone else
        $scope.signup.hasAdminPrivileges = function () {
            return authFactory.hasPermission("competition", season.currentYear, "Administrator");
        }

        $scope.isCurrentDraft = function () {
            var currentDate = new Date();
            if (currentDate > season.draftDate) return false;
            return true;
        }

        // The following sequence is to request a token to be sent to an email address.
        $scope.signup.requestAccount = function (fromAdmin) {
            // TODO - Finish validatation, admin create
            //if ($scope.requestForm.$valid) {
            $scope.signup.adminRequest = fromAdmin;
            authFactory.requestAccount($scope.signup, $scope.signup.email, $scope.signup.name, fromAdmin);
            //}
        }
    }

    // When the validateToken call returns, we either proceed to create the account
    // or present an error message. Activate a watch function.
    $scope.$watch('signup.validateResult', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            if ($scope.signup.validateResult.result == "success") {
                $scope.signup.page = "CreateAccount";
            } else {
                $scope.signup.page = "BadToken";
            }
        }
    });

    // When the requestAccount call returns, indicate success of failure
    $scope.$watch('signup.requestResult', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            if ($scope.signup.requestResult.result == "success") {
                // This could be an admin request
                if ($scope.signup.adminRequest) {
                    if ($scope.signup.requestResult.href) {
                        var link = decodeURIComponent($scope.signup.requestResult.href);
                        $location.path(link);
                    } else {
                        $scope.signup.requestResult.error = "No valid signup token returned";
                        $scope.signup.page = "MailFail";
                    }
                } else {
                    $scope.signup.page = "MailSent";
                }
            } else {
                $scope.signup.page = "MailFail";
            }
        }
    });

    // Function called when create account button is clicked
    $scope.submitAccount = function () {
        if (ValidateCreateAccountForm()) {
            authFactory.createAccount($scope.signup);
        }
    }

    // When the createAccount call returns, indicate success or failure
    $scope.$watch('signup.createResult', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            if ($scope.signup.createResult.result == "success") {
                $scope.signup.page = "AccountCreated";
                // Did we get here from buddy pick invite?
                if ($scope.signup.acceptedInvite) {
                    authFactory.acceptInvite($scope.signup.invite, $scope.signup.email, $scope.signup.createResult.userId, $scope.signup.invite.teamId, $scope.signup.invite.token);
                }
            } else {
                $scope.signup.page = "CreationFailed";
            }
        }
    });

    // TODO - use more automated validation, but this is a 
    // quick first cut.
    function ValidateCreateAccountForm() {
        var signup = $scope.signup;
        signup.account = {};
        signup.contact = {};
        signup.account.errorText = false;
        signup.contact.errorText = false;
        if (!signup.firstName) ReportFormError(signup.account, "You must provide your first name");
        if (!signup.lastName) ReportFormError(signup.account, "You must provide your last name");
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

    // ========== END OF SIGNUP SECTION =======

    // ==========================================
    // === Initialization for invitation page ===
    // === (Signup for invited players)       ===
    // ==========================================
    if (page == "invite") {
        $scope.signup = authFactory.signup;
        //$scope.signup.page = "Offline";  // Temp takedown
        $scope.signup.page = {};
        $scope.signup.invite = {};
        $scope.signup.invite.token = $routeParams.token;
        $scope.signup.invite.email = decodeURIComponent($routeParams.email);
        $scope.signup.invite.teamId = $routeParams.teamId;
        $scope.signup.invite.objType = "invite";
        $scope.signup.state = "WA";
        if (($scope.signup.invite.token === undefined) || ($scope.signup.invite.email === undefined) || ($scope.signup.invite.teamId === undefined)) {
            // Need more informative message
            $location.path("/message/not-authorized");
        }
        $scope.signup.page = "Loading";
        authFactory.validateToken($scope.signup.invite, $scope.signup.invite.email, $scope.signup.invite.teamId, $scope.signup.invite.token);

        $scope.signup.invite.replyInvite = function (accepted) {
            var invite = $scope.signup.invite;
            if (accepted) {
                // Next step is to determine if user already has an account
                authFactory.getRegistrationStatus(invite, invite.email, invite.teamId, invite.token);
            } else {
                authFactory.rejectInvitation(invite, invite.email, invite.teamId, invite.token);
            }
        }
    }

    // When the validateToken call returns, we either proceed to create the account
    // or present an error message. Activate a watch function.
    $scope.$watch('signup.invite.validateResult', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            if ($scope.signup.invite.validateResult.result == "success") {
                $scope.signup.invite.teamName = $scope.signup.invite.validateResult.teamName;
                $scope.signup.page = "ReplyInvite";
            } else {
                $scope.signup.page = "BadToken";
            }
        }
    });

    $scope.$watch('signup.invite.statusResult', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            // Need to determine if user is new, in which case they need to create an account.
            // It doesn't matter if they are unregistered or registered since we are only
            // going to update their team access. They can then go to registration page.
            var statusResult = $scope.signup.invite.statusResult;
            if (statusResult.error) {
                $scope.signup.errorTitle = "Server was not able to identify your status";
                $scope.signup.errorText = "The following error was encountered while trying to determine your current account status: " + statusResult.error;
                $scope.signup.page = "ErrorMessage";
            } else if (statusResult.userId && statusResult.userId > 0) {
                // User is existent
                authFactory.acceptInvite($scope.signup.invite, $scope.signup.invite.email, statusResult.userId, $scope.signup.invite.teamId, $scope.signup.invite.token);
                $scope.signup.page = "Invite";
            } else {
                // New user
                $scope.signup.email = statusResult.email;
                $scope.signup.token = $scope.signup.invite.token;
                $scope.signup.page = "CreateAccount";
                $scope.signup.acceptedInvite = true;
            }
        }
    });

    $scope.$watch('signup.invite.acceptResult', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            // This can come from multiple places. need to handle each properly
            var acceptResult = $scope.signup.invite.acceptResult;
            if (acceptResult.error) {
                $scope.signup.page = "ErrorMessage";
                $scope.signup.errorTitle = "Invitation Could Not Be Completed";
                $scope.signup.errorText = "Something went wrong while processing this invitation. Please contact info@pcbl.org and report the following error: ";
                $scope.signup.errorText += acceptResult.error;
            } else {
                $scope.signup.page = "Invite";
            }
        }
    });

    $scope.$watch('signup.invite.rejectResult', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            var rejectResult = $scope.signup.invite.rejectResult;
            if (rejectResult.error) {
                $scope.signup.errorTitle = "Server was not able to process your response";
                $scope.signup.errorText = "The following error was encountered while trying to process your response: " + rejectResult.error;
                $scope.signup.page = "ErrorMessage";
            } else {
                $scope.signup.errorTitle = "Buddy Pick Invitation has been Declined";
                $scope.signup.errorText = "Your response has been recorded";
                $scope.signup.page = "ErrorMessage";
            }
        }
    });

    // ========== END OF INVITE SECTION =======

    // ==================================================
    // === Initialization for draft registration page ===
    // ==================================================

    if (page == "draft") {
        $scope.draft = authFactory.draft;
        authFactory.draft.Ok = true   // Temporary override TODO Remove

        if (!authFactory.login.loggedIn) {
            $location.path("/message/not-logged-in");
        }
        if (!authFactory.draft.Ok ||
            !authFactory.hasPermission("user", authFactory.login.userId, "Administrator")) {
            $location.path("/message/not-authorized");
        }
        $scope.draft.objType = "draft";
        $scope.draft.form = {};
        $scope.draft.form.year = season.currentYear;
        $scope.draft.form.userId = authFactory.login.userId;
        $scope.draft.form.position1 = "none";
        $scope.draft.form.position2 = "none";
        $scope.draft.form.position3 = "none";
        $scope.draft.form.position4 = "none";
        $scope.draft.form.position5 = "none";
        $scope.draft.form.experience = "none";
        $scope.draft.page = "EnterDraft";   //EnterDraft
    }

    $scope.showWaiver = function () {
        $scope.draft.page = "Waiver"
        $scope.draft.form.signature = "";
        dataFactory.getArticleHtml($scope, "waiver")
    }

    $scope.signWaiver = function (signed) {
        if (signed) {
            if ($scope.draft.form.signature === $scope.login.userName) {
                $scope.draft.form.signatureError = false;
                $scope.draft.waiver = true;
                $scope.draft.page = "EnterDraft";
            } else {
                $scope.draft.form.signatureError = true;
            }
        } else {
            $scope.draft.form.signatureError = false;
            $scope.draft.page = "EnterDraft";
        }
    }

    $scope.submitDraft = function () {
        authFactory.registerDraft($scope.draft, $scope.draft.form);
        $scope.draft.submitted = true;
    }

    // When the registerDraft call returns, indicate success or failure
    $scope.$watch('draft.result', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            if ($scope.draft.result.error) {
                $scope.draft.page = "SignupFailed";
            } else {
                $scope.draft.page = "SignedUp";
            }
        }
    });


    // ========== END OF DRAFT SECTION =======

    // =======================================================
    // === Initialization for free agent registration page ===
    // =======================================================
    if (page == "freeAgent") {
        $scope.freeAgent = authFactory.freeAgent;
        authFactory.freeAgent.Ok = true   // Temporary override TODO Remove

        if (!authFactory.login.loggedIn) {
            $location.path("/message/not-logged-in");
        }
        if (!authFactory.freeAgent.Ok ||
            !authFactory.hasPermission("user", authFactory.login.userId, "Administrator")) {
            $location.path("/message/not-authorized");
        }
        $scope.freeAgent.objType = "freeAgent";
        $scope.freeAgent.form = {};
        $scope.freeAgent.form.year = season.currentYear;
        $scope.freeAgent.form.userId = authFactory.login.userId;
        $scope.freeAgent.form.experience = "none";

        $scope.freeAgent.page = "EnterFreeAgent";   //EnterFreeAgent


        $scope.showWaiver = function () {
            $scope.freeAgent.page = "Waiver"
            $scope.freeAgent.form.signature = "";
            dataFactory.getArticleHtml($scope, "waiver")
        }

        $scope.signWaiver = function (signed) {
            if (signed) {
                if ($scope.freeAgent.form.signature === $scope.login.userName) {
                    $scope.freeAgent.form.signatureError = false;
                    $scope.freeAgent.waiver = true;
                    $scope.freeAgent.page = "EnterFreeAgent";
                } else {
                    $scope.freeAgent.form.signatureError = true;
                }
            } else {
                $scope.freeAgent.form.signatureError = false;
                $scope.freeAgent.page = "EnterFreeAgent";
            }
        }


        $scope.submitFreeAgent = function () {
            //console.log($scope.freeAgent.form);
            authFactory.registerFreeAgent($scope.freeAgent, $scope.freeAgent.form);
            $scope.freeAgent.submitted = true;
        }

        // When the registerfreeAgent call returns, indicate success or failure
        $scope.$watch('freeAgent.result', function (newValue, oldValue) {
            if (newValue && newValue != oldValue) {
                if ($scope.freeAgent.result.error) {
                    $scope.freeAgent.page = "SignupFailed";
                } else {
                    $scope.freeAgent.page = "SignedUp";
                }
            }
        });
    }

    // ========== END OF FREE AGENT SECTION =======

    // =====================================
    // === Initialization for admin page ===
    // =====================================
    //*** There are a number of subcategories for admin pages

    if (page == "admin") {
        $scope.admin = authFactory.admin;
        $scope.admin.objType = "admin";

        if ($location.path().search("/content") >= 0) {
            if (!authFactory.hasPermission("affiliate", authFactory.login.userId, "Editor")) {
                $location.path("/message/not-authorized");
            }
            $scope.admin.content = {};
            $scope.admin.content.type = "Manage";
            $scope.admin.content.tabPage = 0;
            $scope.admin.content.lastPage = 5;  // Current limit for blog pages
            $scope.admin.content.searchFor = "";
            $scope.admin.content.warning = "";
            $scope.admin.content.confirm = "";
            $scope.admin.content.error = "";
            // Load library and blogList from server
            RefreshContentInfo();

            $scope.admin.content.showType = function (type) {
                $scope.admin.content.type = type;
            }

            $scope.admin.content.setTab = function (pageNumber) {
                // This may be called by angular before the blog is set
                // up so skip if no bloglist yet.
                if ($scope.admin.content.blogList) {
                    $scope.admin.content.tabPage = pageNumber;
                    $scope.admin.content.currentPageContents = $scope.admin.content.blogList[pageNumber];
                }
            }

            $scope.admin.content.getTabIndex = function (pageName) {
                if (pageName == "article") return 1;
                if (pageName == "document") return 2;
                return 0; // blog
            }

            $scope.admin.content.filterArticles = function (article) {
                if ($scope.admin.content.searchFor.length == 0) return true;
                if (article.title.indexOf($scope.admin.content.searchFor) >= 0) return true;
                return false;
            }

            $scope.admin.content.saveContentLibrary = function () {
                authFactory.saveContentLibrary($scope.admin.content, $scope.admin.content.library);
            }

            $scope.admin.content.moveItemUp = function (index) {
                var currentPage = $scope.admin.content.currentPageContents;
                var item = currentPage[index];
                // Special case if this is top item
                if (index == 0) {
                    // Should not happen on page 0, but just in case:
                    var page = $scope.admin.content.tabPage
                    if (page > 0) {
                        currentPage.splice(index, 1);
                        $scope.admin.content.blogList[page - 1].push(item);
                    }
                } else {
                    currentPage[index] = currentPage[index - 1];
                    currentPage[index - 1] = item;
                }
                RenumberBlog();
            }

            $scope.admin.content.moveItemDown = function (index) {
                var currentPage = $scope.admin.content.currentPageContents;
                var item = currentPage[index];
                // Special case if this is bottom item
                if (index == currentPage.length - 1) {
                    // If this is last page, don't do anything
                    var page = $scope.admin.content.tabPage;
                    if (page < $scope.admin.content.lastPage) {
                        currentPage.splice(index, 1);
                        // The next page may not exist yet
                        if ($scope.admin.content.blogList.length < page + 2) {
                            $scope.admin.content.blogList[page + 1] = [];
                        }
                        $scope.admin.content.blogList[page + 1].unshift(item);
                    }
                } else {
                    currentPage[index] = currentPage[index + 1];
                    currentPage[index + 1] = item;
                }
                RenumberBlog();
            }

            $scope.admin.content.removeItem = function (index) {
                var currentPage = $scope.admin.content.currentPageContents;
                var item = currentPage[index];
                item.blogPage = undefined;
                item.pageIndex = undefined;
                $scope.admin.content.currentPageContents.splice(index, 1);
                RenumberBlog();
            }

            $scope.admin.content.publishItem = function (item) {
                $scope.admin.content.currentPageContents.unshift(item);
                RenumberBlog();
            }

            $scope.admin.content.viewArticle = function (item) {
                // Start loading of content
                $scope.admin.content.viewItem = item;
                $scope.admin.content.current = {};
                $scope.admin.content.current.html = {};
                dataFactory.loadHttp($scope.admin.content.current, item.contentId);
                $scope.admin.content.preview = false;
                $scope.admin.content.type = "View";
            }

            $scope.admin.content.editArticle = function (item, index) {
                // clone current item and save index
                //var editItem = JSON.parse(JSON.stringify(item));
                var editItem = JSON.parse(angular.toJson(item));
                $scope.admin.content.currentIndex = index;
                $scope.admin.content.editItem = editItem;
                // Initialize editor state
                $scope.admin.content.autoFile = false;
                $scope.admin.content.autoAuthor = false;
                $scope.admin.content.autoDate = false;

                // fix broken dates
                editItem.dateTime = new Date(editItem.dateTime);
                var testDate = new Date(2015, 0, 1);
                if (editItem.dateTime < testDate) editItem.dateTime = testDate;

                // Start loading of content
                $scope.admin.content.body = {};
                $scope.admin.content.body.html = {};
                $scope.admin.content.teaser = {};
                $scope.admin.content.teaser.html = {};
                dataFactory.loadHttp($scope.admin.content.body, editItem.contentId);
                if (editItem.hasTeaser) {
                    dataFactory.loadHttp($scope.admin.content.teaser, editItem.contentId + "-teaser");
                }
                $scope.admin.content.setCurrentContent($scope.admin.content.body);
                $scope.admin.content.type = "Edit";
            }

            $scope.admin.content.setCurrentContent = function (content) {
                $scope.admin.content.current = content;
            }

            $scope.admin.content.previewArticle = function () {
                $scope.admin.content.viewItem = $scope.admin.content.editItem;
                $scope.admin.content.preview = true;
                $scope.admin.content.type = "View";
            }

            $scope.admin.content.saveArticle = function () {
                Utilities.log("Save Article Here ...");
                // First we clone a copy of the editItem
                //var replaceItem = JSON.parse(JSON.stringify($scope.admin.content.editItem));
                var replaceItem = JSON.parse(angular.toJson($scope.admin.content.editItem));
                $scope.admin.content.library[$scope.admin.content.currentIndex] = replaceItem;
                authFactory.saveArticleHtml($scope.admin.content.current, replaceItem.contentId, $scope.admin.content.body.html);
                if (replaceItem.type == "blog" && replaceItem.hasTeaser) {
                    authFactory.saveArticleHtml($scope.admin.content.teaser, replaceItem.contentId + "-teaser", $scope.admin.content.teaser.html);
                }
                $scope.admin.content.type = "Manage";
            }

            $scope.admin.content.clearHtml = function () {
                $scope.admin.content.current.html = "";
            }

            $scope.admin.content.removeArticle = function (index) {
                var answer = confirm("Note: If you remove an item from the library, the corresponding file is not automatically deleted." +
                    " However, the item can only added back to the library by the system administrator.\n" +
                    "Do you wish to remove this item?");
                if (answer) {
                    //remove from blogList if it is there
                    item = $scope.admin.content.library[index];
                    if (item.blogPage) {
                        var pageContents = $scope.admin.content.blogList[item.blogPage - 1];
                        pageContents.splice(item.pageIndex, 1);
                        RenumberBlog();
                    }
                    $scope.admin.content.library.splice(index, 1);
                }
            }

            $scope.admin.content.generateFilename = function () {
                if ($scope.admin.content.autoFile) {
                    var title = $scope.admin.content.editItem.title;
                    var filename = title.toLowerCase().trim().split(' ').join('-');
                    $scope.admin.content.editItem.contentId = filename;
                }
                $scope.admin.content.setDirty(true);
            }

            $scope.admin.content.autoUpdates = function () {
                if ($scope.admin.content.autoAuthor) {
                    $scope.admin.content.editItem.author = authFactory.login.userName;
                }
                if ($scope.admin.content.autoDate) {
                    $scope.admin.content.editItem.dateTime = new Date();
                }
            }

            $scope.admin.content.createNew = function () {
                var newArticle = {};
                newArticle.title = "New Article";
                newArticle.contentId = "new-article";
                newArticle.author = authFactory.login.userName;
                newArticle.dateTime = new Date();
                newArticle.type = "blog";
                newArticle.hasTeaser = false;
                $scope.admin.content.library.unshift(newArticle);
                $scope.admin.content.setDirty(true);
            }

            $scope.admin.content.setDirty = function (dirty) {
                if (dirty) {
                    $scope.admin.content.warning = "Warning: Unpublished Changes";
                } else {
                    $scope.admin.content.warning = "";
                }
            }

            $scope.$watch('admin.content.library', function (newValue, oldValue) {
                if (newValue && newValue != oldValue) {
                    PrepareBlogList();
                }
            });

            $scope.$watch('admin.content.status', function (newValue, oldValue) {
                if (newValue && newValue != oldValue) {
                    // Display success and error messages
                    // and do a refresh/reload
                    if (newValue == "returned") {
                        var result = $scope.admin.content.result;
                        if (result.error) {
                            $scope.admin.content.error = "Error: " + result.error;
                        } else {
                            $scope.admin.content.confirm = "Save Successful";
                            $scope.admin.content.setDirty(false);
                        }
                        RefreshContentInfo();
                    }
                }
            });
        }


        else if ($location.path().search("/buddy") >= 0) {
            $scope.admin.buddy = {};
            $scope.admin.buddy.teamId = $routeParams.teamId;
            $scope.admin.buddy.teamName = $routeParams.teamName;
            $scope.admin.buddy.divisionName = $routeParams.divisionName;
            if (!authFactory.hasPermission("team", $scope.admin.buddy.teamId, "Manager")) {
                $location.path("/message/not-authorized");
            }
            $scope.admin.buddy.players = [];
            $scope.admin.buddy.error = undefined;
            $scope.admin.buddy.userId = authFactory.login.userId;
            RefreshInvitees();

            $scope.admin.buddy.sendInvite = function (resend) {
                if (ValidateSend()) {
                    // Clear all notification windows
                    $scope.admin.buddy.error = "";
                    $scope.admin.buddy.confirm = "";
                    $scope.admin.buddy.resend = "";
                    authFactory.invitePlayer($scope.admin.buddy, $scope.admin.buddy.email, $scope.admin.buddy.name, $scope.admin.buddy.teamId, resend);
                }
            }

            $scope.admin.buddy.hasInvitees = function () {
                return ($scope.admin.buddy.players && $scope.admin.buddy.players.length > 0);
            }

            // When the invitePlayer call returns, indicate success of failure
            $scope.$watch('admin.buddy.result', function (newValue, oldValue) {
                if (newValue && newValue != oldValue) {
                    if ($scope.admin.buddy.result.error) {
                        var error = $scope.admin.buddy.result.error;
                        if (error == "tooSoon") {
                            $scope.admin.buddy.error = "Invitation Failed: An invitation has been sent to this address within the past 12 hours. Please wait before resending."
                        } else if (error == "repeat") {
                            $scope.admin.buddy.resend = "An invitation has already been sent to this address. Do you wish to re-send?";
                        } else if (error == "noAccount") {
$scope.admin.buddy.resend = "No existing account matches the specified email address. If this player has previously been a member of the PCBL, you are attempting to "
            + "send to the wrong address; please use the correct address.\n\nCan you confirm that the invited player has no existing PCBL account?\n";
                        } else {
                            $scope.admin.buddy.error = "Invitation Failed: Reason = " + $scope.admin.buddy.result.error;
                        }
                    } else {
                        $scope.admin.buddy.confirm = "Invitation has been mailed to: " + $scope.admin.buddy.email;
                        RefreshInvitees();
                    }
                }
            });
        }

        else if ($location.path().search("/billing") >= 0) {
            authFactory.billing = {};
            $scope.admin.billing = authFactory.billing;
            $scope.admin.billing.year = season.currentYear.toString();
            $scope.admin.billing.yearList = dataFactory.yearsSince(season.firstBillingYear, true);
            if (!authFactory.hasPermission("competition", season.currentYear, "Treasurer")) {
                $location.path("/message/not-authorized");
            }
            if ($location.path().search("/billing/player") >= 0) {
                // If "player" is part of the URL path, this is the player billing page
                Utilities.log("...Player Billing");

                $scope.admin.billing.playerId = $routeParams.playerId;
                $scope.admin.billing.registrationId = $routeParams.registrationId;
                if ($routeParams.year) $scope.admin.billing.year = $routeParams.year;
                $scope.admin.billing.method = "check";
                $scope.admin.billing.comment = null;
                $scope.admin.billing.registration = {};
                $scope.admin.billing.selectedEvent = -1;
                $scope.admin.billing.queryType = "Overpaid";
                // Don't activate showPay unless we have already selected a player
                if ($routeParams.registrationId) {
                    $scope.admin.billing.showPay = true;
                }
                $scope.admin.billing.selectActive = false;

                // Function for controlling tab selection
                $scope.admin.billing.showType = function (type) {
                    $scope.admin.billing.error = "";
                    $scope.admin.billing.confirm = "";
                    $scope.admin.billing.dollarAmount = null;
                    $scope.admin.billing.amount = null;
                    $scope.admin.billing.comment = null;
                    $scope.admin.billing.appliesToEvent = null;
                    $scope.admin.billing.type = type;
                    $scope.searchType = "Season";
                    if (type == "Credit") {
                        $scope.admin.billing.showPay = true;
                    } else {
                        $scope.admin.billing.showPay = false;
                    }
                    /*
                    if (type != "Credit") {
                        $scope.admin.billing.creditPrepared = false;
                    } else if (type == "Credit" && !$scope.admin.billing.creditPrepared) {
                        $scope.admin.billing.creditPrepared = true;
                        PrepareCredit();
                    }
                    */
                };

                // Query function to find a player
                $scope.admin.billing.submitPlayerQuery = function (playerId, playerFirstName, playerLastName, playerEmail, searchType) {
                    authFactory.getPlayerSearch($scope.admin.billing, playerId, playerFirstName, playerLastName, playerEmail, searchType);
                };

                // Query function to find a player
                $scope.admin.billing.submitAccountQuery = function (queryType, queryYear) {
                    authFactory.getAccountSearch($scope.admin.billing, queryType, queryYear);
                };

                // Function to determine header of Balance/Refund/Deductions
                $scope.admin.billing.getBalanceHeader = function () {
                    header = "Balance";
                    queryType = $scope.admin.billing.queryType;
                    if (queryType == "Refund") header = "Refund";
                    if (queryType == "Deductions") header = "Deductions";
                    return header;
                };

                // Clear previous results when selectors changed
                $scope.admin.billing.clearQuery = function () {
                    $scope.admin.billing.searchResults = null;
                };

                // Clear previous results when selectors changed
                $scope.admin.billing.emptyResults = function () {
                    if ($scope.admin.billing.searchResults && $scope.admin.billing.searchResults.length == 0) return true;
                    return false;
                };


                // If a specific playerId is passed via the URL path, view the different options
                if ($scope.admin.billing.playerId) {
                    $scope.admin.billing.showType("Credit");
                    GetPlayerBillingInfo($scope.admin.billing.year, $scope.admin.billing.playerId);
                    // ... otherwise, allow for a player search
                } else {
                    $scope.admin.billing.showType("Select");
                    $scope.admin.billing.selectActive = true;
                    $scope.admin.billing.activeTab = 4;
                }

                $scope.admin.billing.adjustAmount = function () {
                    $scope.admin.billing.amount = Math.floor(100 * $scope.admin.billing.dollarAmount + .1);
                }

                $scope.admin.billing.isActive = function (status) {
                    return (status == 'Active');
                }

                $scope.admin.billing.priorSeason = function () {
                    if ($scope.admin.billing.type == "Select") return false;
                    if ($scope.admin.billing.type == "Queries") return false;
                    if ($scope.admin.billing.year == season.currentYear) return false;
                    return true;
                }


            } else {
                $scope.admin.itemsPerPage = 50;
                $scope.admin.currentPage = 1;
                $scope.admin.maxPages = 5;
                $scope.admin.billing.transactionCount = undefined;
                $scope.admin.billing.loadingData = false;
                $scope.admin.billing.yearList = dataFactory.yearsSince(season.firstYear, false);
                GetBillingSummary();
                GetTransactions();
            }

            $scope.admin.billing.tabsDisabled = function () {
                return (!$scope.admin.billing.playerId || $scope.admin.billing.playerId < 1);
            }

            $scope.admin.billing.showPlayer = function (registrationId, userId, year) {
                //  href="#!/admin/billing/player/{{result.registrationId}}/{{result.playerId}}"
            }
        }

        else if ($location.path().search("/player") >= 0) {
            $scope.admin.player = {};
            $scope.admin.player.playerId = $routeParams.playerId;
            $scope.admin.player.profile = {};
            $scope.admin.player.roles = [];
            $scope.admin.player.permissions = {};
            $scope.admin.player.year = season.currentYear; // May need more specific reference to team year.
            $scope.admin.player.confirm = "";
            $scope.admin.player.error = "";
            $scope.admin.administrator = {};
            $scope.admin.administrator.gotTeams = false;
            $scope.admin.player.level = "team"; // ??
            // This authorization check makes no sense, as it allows only season administrators to set team permissions. Not sure when this
            // was changed, since GMs used to be able to do this. I am just going to disable it for now and assume that nobody would have gotten this
            // far without proper GM permissions, but that is potentially dangerous. Further investigation required - RWB
            //if (!authFactory.hasPermission("competition", season.currentYear, "Administrator")) {
            //    $location.path("/message/not-authorized");
            //}
            authFactory.getProfile($scope.admin.player, $scope.admin.player.playerId);
            authFactory.getRoles($scope.admin.player, $scope.admin.player.playerId);
            authFactory.getAllTeams($scope.admin.administrator);

            $scope.admin.administrator.setLevel = function () {
                var grantor = $scope.admin.administrator;
                if (grantor.level == "division" || grantor.level == "team") {
                    var lastDivision = "";
                    grantor.divisionList = [];
                    for (index = 0; index < grantor.teams.length; index++) {
                        var team = grantor.teams[index];
                        if ((grantor.divisionsAllowed && grantor.divisionsAllowed[team.divisionId]) ||
                            (grantor.teamsAllowed && grantor.teamsAllowed[team.teamId]) ||
                            grantor.affiliateAllowed ||
                            grantor.competitionAllowed) {
                            if (team.division != lastDivision) {
                                lastDivision = team.division;
                                grantor.divisionList.push(team);
                            }
                        }
                    }
                    grantor.division = grantor.divisionList[0].division;
                    grantor.divisionId = grantor.divisionList[0].divisionId;
                    grantor.setDivision();
                } else {
                    PopulatePermissions();
                }
            }

            $scope.admin.administrator.setDivision = function () {
                var grantor = $scope.admin.administrator;
                if (grantor.level == "team") {
                    grantor.teamList = [];
                    for (index = 0; index < grantor.teams.length; index++) {
                        var team = grantor.teams[index];
                        if ((grantor.teamsAllowed && grantor.teamsAllowed[team.teamId]) ||
                            grantor.divisionsAllowed[team.divisionId] ||
                            grantor.affiliateAllowed ||
                            grantor.competitionAllowed) {
                            if (team.division == grantor.division) {
                                grantor.teamList.push(team);
                            }
                        }
                    }
                    grantor.teamName = grantor.teamList[0].teamName;
                    grantor.teamId = grantor.teamList[0].teamId;
                    grantor.divisionId = grantor.teamList[0].divisionId;

                } else if (grantor.level == "division") {
                    for (index = 0; index < grantor.divisionList.length; index++) {
                        var team = grantor.divisionList[index];
                        if (team.division == grantor.division) {
                            grantor.divisionId = team.divisionId;
                            break;
                        }
                    }
                }
                PopulatePermissions();
            }

            $scope.admin.administrator.setTeam = function () {
                var grantor = $scope.admin.administrator;
                for (index = 0; index < grantor.teams.length; index++) {
                    var team = grantor.teams[index];
                    // If it matches, set teamId
                    if (team.division == grantor.division && team.teamName == grantor.teamName) {
                        grantor.teamId = team.teamId;
                        break;
                    }
                }
                PopulatePermissions();
            }

            $scope.admin.administrator.canAssign = function (level) {
                var grantor = $scope.admin.administrator;
                switch (level) {
                    case "affiliate":
                        return grantor.affiliateAllowed;
                        break;
                    case "competition":
                        return grantor.affiliateAllowed || grantor.competitionAllowed;
                        break;
                    case "division":
                        return grantor.affiliateAllowed || grantor.competitionAllowed || (grantor.divisionsAllowed && grantor.divisionsAllowed.length) > 0;
                        break;
                }
            }

            $scope.admin.administrator.showLevel = function (level) {
                var grantor = $scope.admin.administrator;
                if (grantor.level == "team") return true;
                if (grantor.level == "division" && level == "division") return true;
                return false;
            }

            $scope.admin.player.cancelEdit = function () {
                authFactory.getProfile($scope.admin.player, $scope.admin.player.playerId);
                $scope.admin.player.profile.canEdit = false;
            }

            $scope.admin.player.saveProfile = function () {
                // Must pass along player and team Ids
                var profile = $scope.admin.player.profile;
                profile.user_id = $scope.admin.player.playerId;
                authFactory.saveProfile($scope.admin.player, profile);
                // TODO: Confirmation message and reload profile
                $scope.admin.player.profile.canEdit = false;
            }

            // When the getRoles call returns, initialize permissions
            $scope.$watch('admin.player.rolesLoaded', function (newValue, oldValue) {
                if (newValue && newValue != oldValue) {
                    PopulatePermissions();
                }
            });
        }

        else if ($location.path().search("/umpire") >= 0) {
            $scope.admin.umpire = {};
            if (!authFactory.hasPermission("competition", season.currentYear, "Manager")) {
                $location.path("/message/not-authorized");
            }
            $scope.admin.umpire.yearList = dataFactory.yearsSince(season.firstUmpireYear, false);
            $scope.admin.umpire.yearFilter = season.currentYear.toString() + ",";
            authFactory.getUmpireFeedback($scope.admin.umpire);
        }

        // This must be the dashboard if no other options specified
        // You shouldn't be able to get here unless you are an admin

        //  ADMIN DISCIPLINE PAGE
        else if ($location.path().search("/discipline") >= 0) {
            $scope.admin.discipline = {};
            $scope.admin.discipline.playerSelected = false;
            $scope.admin.discipline.gameSelected = false;
            $scope.admin.discipline.addingDiscipline = false;
            $scope.admin.discipline.playerSearchActive = false;
            $scope.admin.discipline.teamSelected = false;
            $scope.admin.discipline.teamSelectActive = false;
            $scope.admin.discipline.gameSelectActive = false;
            $scope.admin.discipline.newIncident = {};
            $scope.currentDisciplineId = undefined;
            $scope.admin.discipline.year = season.currentYear;

            authFactory.getDisciplines($scope.admin.discipline);
            console.log($scope.admin.discipline);

            //  ***** Need to correct this to Board Members only *****
            //  ***** WHAT IS CALL FOR BOARD MEMBERS ONLY??
            if (!authFactory.hasPermission("competition", season.currentYear, "Manager")) {
                $location.path("/message/not-authorized");
            }

            // Query function to find a player
            // TODO: Redundant with admin player billing: perhaps player query should be made a directive.
            $scope.admin.discipline.submitPlayerQuery = function (playerId, playerFirstName, playerLastName, playerEmail, searchType) {
                authFactory.getPlayerSearch($scope.admin.discipline, playerId, playerFirstName, playerLastName, playerEmail, searchType);
                $scope.admin.discipline.playerSearchActive = true;
            };

            $scope.admin.discipline.selectPlayer = function (registrationId, firstName, lastName, year, playerId) {
                $scope.admin.discipline.newIncident.registrationId = registrationId;
                $scope.admin.discipline.newIncident.playerName = firstName + " " + lastName;
                $scope.admin.discipline.newIncident.year = year;
                $scope.admin.discipline.newIncident.playerId = playerId;
                authFactory.getTeamList($scope.admin.discipline, year, playerId);
                $scope.admin.discipline.playerSelected = true;
                $scope.admin.discipline.playerSearchActive = false;
                $scope.admin.discipline.teamSelectActive = true;
            }

            $scope.admin.discipline.selectTeam = function (teamName, teamId, divisionName, divisionId) {
                $scope.admin.discipline.newIncident.teamName = teamName;
                $scope.admin.discipline.newIncident.teamId = teamId;
                $scope.admin.discipline.newIncident.divisionName = divisionName;
                $scope.admin.discipline.newIncident.divisionId = divisionId;
                scheduleFactory.getGames($scope.admin.discipline, {
                    year: $scope.admin.discipline.newIncident.year,
                    teamId: $scope.admin.discipline.newIncident.teamId,
                    scheduleType: "team",
                })
                $scope.admin.discipline.teamSelected = true;
                $scope.admin.discipline.teamSelectActive = false;
                $scope.admin.discipline.gameSelectActive = true;
            }

            $scope.admin.discipline.selectGame = function (gameId, dateTime) {
                $scope.admin.discipline.newIncident.gameId = gameId;
                $scope.admin.discipline.newIncident.gameTime = dateTime;

                $scope.admin.discipline.gameSelectActive = false;
            }

            $scope.admin.discipline.addNewDiscipline = function (incident) {
                incident.id = $scope.currentDisciplineId;
                incident.appealStatus = 0;
                console.log(incident);
                authFactory.saveDiscipline($scope, incident);
                $scope.admin.discipline.playerSelected = false;
                $scope.admin.discipline.gameSelected = false;
                $scope.admin.discipline.addingDiscipline = false;
                $scope.admin.discipline.playerSearchActive = false;
                $scope.admin.discipline.teamSelected = false;
                $scope.admin.discipline.teamSelectActive = false;
                $scope.admin.discipline.gameSelectActive = false;
                authFactory.getDisciplines($scope.admin.discipline);
            }

            $scope.admin.discipline.addDiscipline = function () {
                $scope.admin.discipline.addingDiscipline = true;
                $scope.currentDisciplineId = -1;
            }

            $scope.admin.discipline.cancelDiscipline = function () {
                // Reset all the selected flags
                $scope.admin.discipline.playerSelected = false;
                $scope.admin.discipline.gameSelected = false;
                $scope.admin.discipline.addingDiscipline = false;
                $scope.admin.discipline.playerSearchActive = false;
                $scope.admin.discipline.teamSelected = false;
                $scope.admin.discipline.teamSelectActive = false;
                $scope.admin.discipline.gameSelectActive = false;
                $scope.admin.discipline.newIncident = [];
            }

            $scope.admin.discipline.openAppeal = function (incident) {
                incident.appealOpened = 1;
            }
            $scope.admin.discipline.cancelAppeal = function (incident) {
                // Reset all selected flags
                incident.appealOpened = 0;
                incident.appealNotes = null;
                incident.appealDate = null;
            }

            $scope.admin.discipline.saveAppeal = function (incident) {
                incident.appealStatus = 1;
                incident.appealOpened = 0;
                incident.appealRuling = null;
                authFactory.saveDiscipline($scope, incident);
            }

            $scope.admin.discipline.openRuling = function (incident) {
                incident.appealOpened = 1;
            }
            $scope.admin.discipline.saveRuling = function (incident) {
                incident.appealStatus = 2;
                incident.appealOpened = 0;
                authFactory.saveDiscipline($scope, incident);
            }
            $scope.admin.discipline.cancelRuling = function (incident) {
                // Reset all selected flags
                incident.appealOpened = 0;
                incident.appealRuling = null;
                incident.appealRulingNotes = null;
                incident.appealJudge = null;
                incident.revisedPenalty = null;

            }

       }

        else if (!(authFactory.login.isAdmin)) {
            $location.path("/message/not-authorized");
        }
    }

    $scope.admin.buildPlayerName = function (firstName, lastName) {
        if (!firstName || !lastName) return "**Not Registered**";
        return firstName + " " + lastName;
    }

    $scope.admin.getAge = function (birthDate) {
        if (!birthDate) return "??";
        var dob = new Date(birthDate)
        var today = new Date();
        return today.getFullYear() - dob.getUTCFullYear();
    }

    $scope.admin.fixDate = function (date) {
        return new Date(date)
    }

    // Apparently, even the very generic date format used in the API can not be parsed by Safari, so
    // we will try painfully parsing it piece by piece
    $scope.admin.parseDateTime = function (input) {
        // Format 2012-07-06 12:59:36
        var match = input.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
        match.shift(); // discard the "full match" index
        match[1]--;
        return new Date(match[0], match[1], match[2], match[3], match[4], match[5]);
    }

    $scope.admin.setPerPage = function (value) {
        Utilities.log("Calling setPerPage ...");
        $scope.admin.itemsPerPage = value;
        $scope.admin.currentPage = 1;
        GetTransactions();
        if ($scope.admin.itemsPerPage < 0) {
            $scope.admin.itemsPerPage = $scope.admin.billing.transactionCount;
        }
        Utilities.log("Exiting setPerPage ...");
    }

    $scope.admin.pageChanged = function (page) {
        $scope.admin.currentPage = page;
        Utilities.log("Calling pageChanged ..." + $scope.admin.currentPage);
        GetTransactions();
    }

    $scope.admin.setYear = function (year) {
        $scope.admin.billing.year = year;
        GetBillingSummary();
        GetTransactions();
    }

    $scope.filterFunction = function (element) {
        return element.name.match(/^Ma/) ? true : false;
    };

    $scope.admin.isSuccessful = function (success) {
        return (success == 1) ? null : "danger";
    }

    $scope.admin.saveRoles = function () {
        // Build the settings object that will be passed to server
        var settings = {}
        var player = $scope.admin.player;
        var grantor = $scope.admin.administrator;
        settings.userId = player.playerId;
        settings.discriminator = grantor.level;
        switch (settings.discriminator) {
            case "affiliate":
                settings.scopeId = 2;
                settings.mask = MakeMask(player.permissions.affiliate);
                break;
            case "competition":
                // scopeId will be set by server
                settings.scopeId = 1;
                settings.mask = MakeMask(player.permissions.competition);
                break;
            case "division":
                settings.scopeId = grantor.divisionId;
                settings.mask = MakeMask(player.permissions.division);
                break;
            case "team":
                settings.scopeId = grantor.teamId;
                settings.mask = MakeMask(player.permissions.team);
                break;
        }
        authFactory.saveRoles($scope.admin.player, settings);
    }

    // When the saveRoles call returns, update the settings
    $scope.$watch('admin.player.result', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            if ($scope.admin.player.result.error) {
                $scope.admin.player.error = "Save Roles Failed: Reason = " + $scope.admin.player.result.error;
            } else {
                authFactory.getRoles($scope.admin.player, $scope.admin.player.playerId);
            }
        }
    });


    // When the events call returns, indicate success or failure
    $scope.$watch('admin.billing.registration.events', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            ExtractAppliesToEvents();
        }
    });

    // When roles have been loaded, need to translate these to checkbox values
    $scope.$watch('admin.administrator.gotTeams', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            PopulateRoleLevels();
        }
    });

    // ========== END OF ADMIN PAGE SECTION =======

    // =====================================
    // === Initialization for team page  ===
    // =====================================
    // This is actually admin/team and maybe shouldn't be
    // treated differently, except it is not part of admin menus

    if (page == "team") {

        if (!authFactory.login.loggedIn) {
            $location.path("/message/not-logged-in");
        }

        $scope.team = authFactory.team;
        $scope.team.teamId = $routeParams.teamId;
        $scope.team.numbers = {};
        $scope.team.numbers.confirm = "";
        $scope.team.numbers.error = "";
        $scope.team.objType = "team";

        if (!authFactory.hasPermission("team", $scope.team.teamId, "Manager")) {
            $location.path("/message/not-authorized");
        }

        LoadRoster($scope.team.teamId);

        $scope.team.showRoles = function (playerId) {
            var roleList = "";
            var mask = Number($scope.team.roster.roles[playerId]);
            if (mask > 0) {
                if (mask & 1) roleList += "Scheduler ";
                if (mask & 2) roleList += "Statistician ";
                if (mask & 4) roleList += "Manager ";
                if (mask & 8) roleList += "Treasurer ";
                if (mask & 16) roleList += "Administrator ";
                if (mask & 32) roleList += "Editor ";
            }
            return roleList;
        }

        $scope.team.editPlayer = function (playerId) {
            $location.path("/admin/player/" + playerId);
        }

        $scope.team.saveNumbers = function () {
            // Create a number list from the roster
            var playerList = $scope.team.roster.players;
            var saveList = {}
            saveList.teamId = $scope.team.teamId;
            saveList.numberList = [];
            for (var index = 0; index < playerList.length; index++) {
                var player = playerList[index];
                var uniNumber = {};
                uniNumber.playerId = player.playerId;
                uniNumber.number = player.number;
                saveList.numberList.push(uniNumber);
            }
            authFactory.saveNumbers($scope.team.numbers, saveList);
        }

        $scope.team.invitePlayers = function () {
            $location.path("/admin/buddy/" + $scope.team.teamId + "/" + $scope.team.roster.divisionName + "/" + $scope.team.roster.teamName);
        }

        $scope.team.teamMailList = function () {
            var list = "";
            // This may be called before roster is loaded, so check
            if ($scope.team.roster && $scope.team.roster.players && $scope.team.roster.players.length > 0) {
                var players = $scope.team.roster.players;
                for (i = 0; i < players.length; i++) {
                    var address = players[i].email;
                    if (list.length > 0) list += ";";
                    list += address;
                }
            }
            return list;
        }

        $scope.team.canAssignNumbers = function () {
            return authFactory.hasPermission("team", $scope.team.teamId, "Administrator");
        }

        $scope.team.canAssignGM = function () {
            return authFactory.hasPermission("division", $scope.team.roster.divisionId, "Manager");
        }

        $scope.team.assignGM = function (index) {
            newGM = $scope.team.roster.players[index];
            authFactory.assignGM($scope.team, $scope.team.teamId, newGM.playerId);
        }

        // When the assignGM call returns, we either proceed to create the account
        // or present an error message. Activate a watch function.
        $scope.$watch('team.assignResult', function (newValue, oldValue) {
            if (newValue && newValue != oldValue) {
                if ($scope.team.assignResult.status == "success") {
                    // Reload page
                    $route.reload();
                } else {
                    // Do some kind of error notification
                }
            }
        });
    }

    // ========== END OF TEAM SECTION =======

    // =====================================
    // === Initialization for mail page  ===
    // =====================================
    // Actually admin/mail .. should probably be
    // moved up into admin section

    if (page == "mail") {

        $scope.mail = {};
        $scope.mail.year = season.currentYear;
        $scope.mail.listType = "All";
        $scope.mail.yearList = dataFactory.yearsSince(season.firstYear, true);

        $scope.mail.downloadMailList = function () {
            $scope.mail.isLoading = false;
            authFactory.downloadMailList($scope.mail);
        }
    }

    // ========== END OF MAIL SECTION =======

    // =====================================
    // === Initialization for support page  ===
    // =====================================

    if (page == "support") {

        $scope.support = {};
        $scope.support.CLAIM = "claim";
        $scope.support.IGNORE = "ignore";
        $scope.support.INTERNAL = "internal";
        $scope.support.LINK = "link";
        $scope.support.REMOVE = "remove"
        $scope.support.year = season.currentYear;
        $scope.support.yearList = dataFactory.yearsSince(season.firstYear, false);
        $scope.support.yearFilter = season.currentYear;
        $scope.support.assigneeOptions = [{id: 1, name: "Bonny"}, {id: 2, name: "Hwang"}, {id:3, name: "Liddil"}, {id: 4, name: "Willard"}];
        $scope.support.statusOptions = [{id: 1, val: 'unassigned'}, {id: 2, val: 'in_progress'}, {id: 3, val: 'completed'}];
        $scope.support.ticketState = [$scope.support.CLAIM, $scope.support.IGNORE, $scope.support.INTERNAL, $scope.support.REMOVE];
        $scope.support.selectedThreadEmails = [];
        $scope.support.selectedOriginEmail = { itemID: null, itemTicket:"  None selected" };
        $scope.support.showThreadingOptions = false;
        $scope.support.shouldShowAll = false;
        console.log($scope.support)

        $scope.support.onAssigneeChange = function (item, supportAssignee) {
            var itemStatus = item.status;
            if (item.status === "unassigned" && item.assigned === "") {
                itemStatus = "in_progress";
            }
            authFactory.updateSupportAssignee($scope.support, supportAssignee, item.id, itemStatus);
            if ($scope.support) {
                $scope.support.items.forEach((ele, ind) => {
                    if (ele.id === item.id) {
                        $scope.support.items[ind].assigned = supportAssignee;
                        $scope.support.items[ind].status = itemStatus;
                    }
                })
            }
        };

        $scope.support.onStatusChange = function (item, status) {
            authFactory.updateSupportAssignee($scope.support, item.assigned, item.id, status);
            if ($scope.support) {
                $scope.support.items.forEach((ele, ind) => {
                    if (ele.id === item.id) {
                        $scope.support.items[ind].status = status
                    }
                })
            }
        }

        $scope.support.onOriginChange = function (item, originID) {
            authFactory.updateItemOriginID($scope.support, item.id, originID);
            if ($scope.support) {
                $scope.support.items.forEach((ele, ind) => {
                    if (ele.id === item.id) {
                        $scope.support.items[ind].id_origin = originID
                    }
                })
            }
        }

        $scope.support.onStatusChange2 = function (item, status, itemKey, subKey) {
            var clickedObj = $scope.support.items[itemKey].data[subKey];
            authFactory.updateSupportAssignee($scope.support, clickedObj.assigned, item.id, status);
            if ($scope.support) {
                var mutated = $scope.support.items[itemKey].data[subKey];
                mutated.status = status;
                mutated.assigned = clickedObj.status;
            }
        }

        $scope.support.onAssigneeChange2 = function (item, supportAssignee, itemKey, subKey) {
            var clickedObj = $scope.support.items[itemKey].data[subKey];

            authFactory.updateSupportAssignee($scope.support, supportAssignee, item.id, clickedObj.status);
            if ($scope.support) {
                var mutated = $scope.support.items[itemKey].data[subKey];
                mutated.status = clickedObj.status;
                mutated.assigned = supportAssignee;
            }
        };

        $scope.support.onTicketAction = function (action, item, currentYear, subKey, itemKey) {
            var assignee = authFactory.login.userName.split(" ")[1]
            if (action === $scope.support.CLAIM) {
                authFactory.createClaim($scope.support, item, currentYear, assignee);
                console.log($scope.support)

                if ($scope.support) {
                    console.log($scope.support)
                }
            } else if (action === $scope.support.LINK) {
                var ticketID = $scope.support.selectedOriginEmail.itemID;
                var ticketNum = $scope.support.selectedOriginEmail.itemTicket
                var originID = $scope.support.selectedOriginEmail.originID;
                if (!ticketID || !ticketNum || !originID) {
                    window.alert("Select a claimed ticket first");
                    return;
                }
                console.log({subKey, itemKey})
                var ticketInd = null;
                var ticketObj = $scope.support.items.find((obj, index) => {
                    ticketInd = index;
                    return obj.id == originID
                });
                
                var ticketStatus = ticketObj.data[0].status;
                console.log($scope.support.selectedOriginEmail);
                authFactory.updateLink($scope.support, item.id, assignee, ticketNum, ticketStatus, originID);

                var mutated = $scope.support.items[itemKey].data[subKey];
                mutated.status = ticketStatus;
                mutated.assigned = assignee;
                mutated.ticket = ticketNum;
                $scope.support.items[itemKey].data.splice(subKey, 1);
                $scope.support.items[ticketInd].data.push(mutated);

            } else if (action == $scope.support.REMOVE) {
                authFactory.updateRemove($scope.support, item.id, assignee);
                $scope.support.items[itemKey].data[subKey].isRemoved = true;
            }
            else {
                console.log($scope.support)
                authFactory.assignIgnoreOrInternal($scope.support, item.id, assignee, action);
            }
        }

        $scope.support.toggleSelection = function (itemID) {
            if ($scope.support.selectedThreadEmails.indexOf(itemID) === -1) {
                $scope.support.selectedThreadEmails.push(itemID);
            } else {
                $scope.support.selectedThreadEmails.splice($scope.selectedThreadEmails.indexOf(itemID), 1);
            }
        }

        $scope.support.selectOriginEmail = function (itemID, itemTicket) {
            console.log(itemID, itemTicket)
            console.log($scope.support.selectedOriginEmail)
            var ticketObj = $scope.support.items.find(obj => obj.ticket == itemTicket);
            var originID = ticketObj.id;
            if ($scope.support.showThreadingOptions) {
                $scope.support.selectedOriginEmail = "None selected";
            } else {
                $scope.support.selectedOriginEmail = {itemID, itemTicket, originID};
            }
        }

        $scope.support.updateSelectedEmailsToOrigin = function () {
            if ($scope.support.selectedThreadEmails.length > 0 ) {
                console.log($scope.support.selectedThreadEmails)
            } else {
                window.alert("Select a claimed ticket as origin")
            }
            
        }

        $scope.support.asDate = function (dateString) {
            return new Date(dateString);
        }
        
        $scope.support.checkBody = function (item) {
            // Must load when first shown.
            if (item.showBody && item.body == null)
            {
                authFactory.loadSupportBody($scope.support, item);
            }
        }

        $scope.support.onShowAll = function() {
            if (!$scope.shouldShowAll) {
                console.log("get all")
                authFactory.getSupportItemsAll($scope.support, $scope.support.year);
            } else {
                console.log("get recent")
                authFactory.getSupportItems2($scope.support, $scope.support.year);
            }
            $scope.shouldShowAll = !$scope.shouldShowAll;
        }
        
        // Go back to original form of function call to simplify development
        authFactory.getSupportItems($scope.support, $scope.support.year);
        //authFactory.getSupportItems2($scope.support, $scope.support.year);

    }

    // ========== END OF SUPPORT SECTION =======

    // =====================================
    // === Initialization for taxi page  ===
    // =====================================
    // Actually admin/taxi .. but the admin
    // section is already pretty busy

    if (page == "taxi") {

        if (!authFactory.hasPermission("competition", authFactory.login.userId, "Manager")) {
            $location.path("/message/not-authorized");
        }
        $scope.taxi = {};
        $scope.taxi.year = season.currentYear;
        $scope.taxi.type = "Requests";
        $scope.taxi.view = "List";
        $scope.taxi.divisionFilter = "All";
        $scope.taxi.statusFilter = "All";
        $scope.taxi.toDate = new Date();
        $scope.taxi.fromDate = new Date();
        $scope.taxi.fromDate.setDate($scope.taxi.toDate.getDate() - 30);
        $scope.taxi.sortBy = "Date";
        $scope.taxi.players = {};
        $scope.taxi.players.list = [];
        $scope.taxi.players.itemsPerPage = 20;
        $scope.taxi.players.currentPage = 1;
        $scope.taxi.players.maxPages = 8;
        $scope.taxi.activePlayerTaxiId = 0;
        $scope.taxi.activePlayerName = undefined;
        $scope.taxi.activeCatcher = 0;
        $scope.taxi.inviteCount = 1;
        $scope.taxi.inviteCatcher = 0;
        $scope.taxi.inviteGear = 0;
        $scope.taxi.error = null;
        $scope.taxi.confirm = null;

        $scope.taxi.showType = function (type) {
            $scope.taxi.type = type;
            if (type == "Players") {
                dataFactory.getPlayerCount($scope.taxi.players, $scope.taxi.year, "Taxi");
                authFactory.getTaxiPlayers($scope.taxi, $scope.taxi.year, $scope.taxi.players.currentPage - 1, $scope.taxi.players.itemsPerPage)
            }
        }

        $scope.taxi.showResponses = function () {
            $scope.taxi.view = "Details";
            $scope.taxi.details = [];
            authFactory.getTaxiDetails($scope.taxi, $scope.taxi.selected.id, "request");
        }

        $scope.taxi.showPending = function () {
            $scope.taxi.view = "Pending";
            $scope.taxi.details = [];
            authFactory.getTaxiDetails($scope.taxi, $scope.taxi.selected.id, "pending");
        }

        $scope.taxi.fetchTaxiRequests = function () {
            $scope.taxi.view = "List";
            authFactory.getTaxiRequests($scope.taxi, $scope.taxi.fromDate, $scope.taxi.toDate);
        }

        $scope.taxi.getDetails = function (request) {
            $scope.taxi.view = "Details";
            $scope.taxi.selected = request
            authFactory.getTaxiDetails($scope.taxi, request.id, "request");
        }

        $scope.taxi.responseStyle = function (status) {
            if (status == "accepted") return { color: 'green' };
            if (status == "declined") return { color: 'red' };
        }

        $scope.taxi.requestFilter = function (request) {
            if ($scope.taxi.divisionFilter != 'All' && $scope.taxi.divisionFilter != request.division) return false;
            if ($scope.taxi.statusFilter != 'All' && $scope.taxi.statusFilter != request.closed) return false;
            return true;
        }

        $scope.taxi.formatPositions = function (bitString) {
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

        $scope.taxi.isTrue = function (testValue) {
            return (testValue == 1);
        }

        $scope.taxi.selectPlayer = function (player) {
            $scope.taxi.activePlayerName = player.playerName;
            $scope.taxi.activePlayerTaxiId = player.taxiId;
        }

        $scope.taxi.assignPlayer = function () {
            authFactory.taxiAssign($scope.taxi, $scope.taxi.selected.id, $scope.taxi.activePlayerTaxiId, $scope.taxi.activeCatcher)
        }

        // Create an empty taxi request that will have no initial invitations
        $scope.taxi.createTaxiRequest = function () {
            // Create object to pass to sendTaxiRequest
            var objRequest = {};
            objRequest.action = "Empty";
            objRequest.userId = authFactory.login.userId;
            objRequest.gameId = $scope.taxi.gameId;
            objRequest.teamId = $scope.taxi.teamId;
            objRequest.numPlayers = $scope.taxi.inviteCount;
            objRequest.catcher = $scope.taxi.inviteCatcher;
            objRequest.gear = $scope.taxi.inviteGear;
            // Clear values and make server call to create empty taxi request
            $scope.taxi.gameId = undefined;
            $scope.taxi.teamId = undefined;
            $scope.taxi.inviteCount = 1;
            $scope.taxi.inviteCatcher = 0;
            $scope.taxi.inviteGear = 0;
            authFactory.sendTaxiRequest($scope.taxi, objRequest);
        }

        $scope.taxi.getPlayerAge = function (birthDate) {
            var dob = new Date(birthDate)
            var today = new Date();
            return today.getFullYear() - dob.getUTCFullYear();
        }

        $scope.taxi.setPerPage = function (value) {
            $scope.taxi.players.itemsPerPage = value;
            $scope.taxi.players.currentPage = 1;
            if ($scope.taxi.players.itemsPerPage < 0) {
                $scope.taxi.players.itemsPerPage = $scope.taxi.players.playerCount;
            }
            authFactory.getTaxiPlayers($scope.taxi, $scope.taxi.year, $scope.taxi.players.currentPage - 1, $scope.taxi.players.itemsPerPage)
        }

        $scope.taxi.pageChanged = function (page) {
            $scope.taxi.players.currentPage = page;
            Utilities.log("Calling pageChanged ..." + $scope.admin.currentPage);
            authFactory.getTaxiPlayers($scope.taxi, $scope.taxi.year, $scope.taxi.players.currentPage - 1, $scope.taxi.players.itemsPerPage)
        }

        $scope.taxi.download = function () {
            var text = "Id,GameId,Division,Teams,Details,Requestor,Request Team,Players,Catchers,Gear,Date,Time,closed,accepted,declined,pending";
            for (var i = 0; i < $scope.taxi.requests.length; i++) {
                var request = $scope.taxi.requests[i];
                if ($scope.taxi.requestFilter(request)) {
                    text += "\n" + request.id;
                    text += "," + request.gameId;
                    text += "," + request.division;
                    text += "," + request.gameDetails;
                    text += "," + request.requestor;
                    text += "," + request.requestTeam;
                    text += "," + request.players;
                    text += "," + request.catchers;
                    text += ",";
                    text += (request.gear == 1) ? "Yes" : "No";
                    text += "," + request.requestTime.toDateString();
                    text += "," + request.requestTime.getHours() + ":";
                    text += (request.requestTime.getMinutes() < 10) ? "0" : "";
                    text += request.requestTime.getMinutes();
                    text += "," + request.closed;
                    text += "," + request.accepted;
                    text += "," + request.declined;
                    text += "," + request.pending;
                }
            }
            dataFactory.downloadAsFile(text, "taxi_requests.csv");
        }

        // When the assignPlayer call returns, we either proceed to create the account
        // or present an error message. Activate a watch function.
        $scope.$watch('taxi.assignResult', function (newValue, oldValue) {
            if (newValue && newValue != oldValue) {
                if ($scope.taxi.assignResult.result == "success") {
                    // Reload page
                    $scope.taxi.activePlayerName = undefined;
                    $scope.taxi.activePlayerTaxiId = 0;
                    $scope.taxi.activeCatcher = 0;
                    $route.reload();
                } else {
                    $scope.taxi.error = $scope.taxi.assignResult.error;
                }
            }
        });

        // When the sendTaxiRequest call returns, we either should show confirm or error message
        $scope.$watch('taxi.requestResult', function (newValue, oldValue) {
            if (newValue && newValue != oldValue) {
                if ($scope.taxi.requestResult.result == "success") {
                    $scope.taxi.confirm = "Successfully created empty request, id = " + $scope.taxi.requestResult.requestId;
                } else {
                    $scope.taxi.error = $scope.taxi.requestResult.error;
                }
            }
        });
    }

    // ========== END OF TAXIPOOL SECTION =======

    // =====================================
    // === Initialization for playoffs page  ===
    // =====================================
    // Actually admin/playoffs .. but the admin
    // section is already pretty busy

    if (page == "playoffs") {
        $scope.playoffs = {};
        $scope.playoffs.year = season.currentYear;
        $scope.playoffs.confirm = undefined;
        $scope.playoffs.error = undefined;

        // Should get these from server, but shortcut for now
        $scope.playoffs.divisionNames = ["Adams", "Adirondack", "Cascade", "Denali", "Everest", "Rainier", "Rocky", "Sierra", "Smoky", "Teton"];
        var divisionNames = ["Adams", "Adirondack", "Cascade", "Denali", "Everest", "Rainier", "Rocky", "Sierra", "Smoky", "Teton"];

        
        $scope.playoffs.buildLink = function () {
            var divisionName = $scope.playoffs.divisionNames[$scope.playoffs.selected];
            var fullLink = ("playoffs/" + $scope.playoffs.year + "/" + divisionName + " Bracket " + $scope.playoffs.year + ".png?decache=" + Math.random());
            return fullLink;
        };

        $scope.playoffs.selectDivision = function (index) {
            $scope.playoffs.confirm = undefined;
            $scope.playoffs.error = undefined;
            $scope.playoffs.selected = index;
            $scope.playoffs.previewLink = $scope.playoffs.buildLink();
        };

        $scope.playoffs.paste = function (event, divisionName, index) {
            // prepare to upload pasted image to server. Do some preliminary error checking here first.
            var clipData = event.clipboardData;
            var gotClip = false;
            for (let itemIndex = 0; itemIndex < clipData.items.length; itemIndex++) {
                var clipItem = clipData.items[itemIndex];
                if (clipItem.type && clipItem.type == "image/png") {
                    // if it is a image
                    var img = clipItem.getAsFile();
                    console.log('A image sized ' + img.size + ' is being uploaded.');
                    var fd = new FormData();
                    fd.append('file', img);
                    gotClip = true;
                    authFactory.uploadBracket($scope.playoffs, divisionName, fd);
                    break;
                }
            }
            // Check to see that an image was found
            if (!gotClip) {
                $scope.playoffs.error = "Error: No image clip pasted";
            } else {
                // Wait for server call return to return to show actual status result and refresh image
                $scope.playoffs.confirm = divisionName + " Bracket Being Updated ....";
            }
            $scope.playoffs.restoreDivisionName(index);

        }

        $scope.playoffs.divisionStyle = function (index) {
            if (index = $scope.playoffs.selected) {
                return "selected";
            } else {
                return "unselected";
            }
        }

        $scope.playoffs.selected = 0;
        $scope.playoffs.previewLink = $scope.playoffs.buildLink();

        $scope.playoffs.restoreDivisionName = function (index) {
            $scope.playoffs.divisionNames[index] = divisionNames[index];
        }

        $scope.$watch("playoffs.requestResult", function (newValue, oldValue) {
            if (newValue && newValue != oldValue) {
                $scope.playoffs.previewLink = $scope.playoffs.buildLink();
            }
        });
    }

    // ========== END OF PLAYOFFS SECTION =======

    // Local Functions

    function CheckForDisabled(functionality) {
        // Right now, everything that calls this is disabled.
        $location.path("/message/disabled");
    }

    function ValidateSend() {
        $scope.admin.buddy.error = undefined;
        if (!$scope.admin.buddy.name) {
            $scope.admin.buddy.error = "Please fill out the player name field";
            return false;
            // Angular will validate the email field and return null if not a valid address
        } else if (!$scope.admin.buddy.email) {
            $scope.admin.buddy.error = "Please enter a vaild email address";
            return false;
        }
        return true;
    }

    function RefreshInvitees() {
        if ($scope.admin.buddy && $scope.admin.buddy.teamId) {
            authFactory.getInvitees($scope.admin.buddy, $scope.admin.buddy.teamId);
        }
    }

    function GetBillingSummary() {
        authFactory.getBillingSummary($scope.admin.billing, $scope.admin.billing.year);
    }

    function GetTransactions() {
        authFactory.getBillingTransactions($scope.admin.billing, $scope.admin.billing.year, $scope.admin.currentPage - 1, $scope.admin.itemsPerPage);
    }

    function LoadRoster(teamId) {
        authFactory.loadRoster($scope.team, teamId);
    }

    function GetPlayerBillingInfo(year, playerId) {
        if (playerId) {
            authFactory.getRegistrationEvents($scope.admin.billing, year, playerId);
            authFactory.getPlayerName($scope.admin.billing, playerId);
            authFactory.getDuesBalance($scope.admin.billing, year, playerId);
        }
    }

    function ExtractAppliesToEvents() {
        // filter and process events that deductions and fees can be applied to
        $scope.admin.billing.applyList = [];
        var applyList = $scope.admin.billing.applyList;
        for (var i = 0; i < $scope.admin.billing.registration.events.length; i++) {
            var event = $scope.admin.billing.registration.events[i];
            var appliesTo = {};
            appliesTo.eventId = event.id;
            appliesTo.amount = event.amount;
            if (event.type == "registered") {
                appliesTo.description = "Registered for " + Utilities.extractBetween("<small>", "</small>", event.comment);
                applyList.push(appliesTo);
                // Save this as the default applies to event for transactions that don't let you specify
                $scope.admin.billing.registerEventId = event.id;
            }
            if (event.type == "team_join") {
                appliesTo.description = "Joined Team - " + Utilities.extractBetween("<small>", "</small>", event.comment);
                applyList.push(appliesTo);
            }
            if (event.type == "fee") {
                appliesTo.description = event.comment;
                applyList.push(appliesTo);
            }
        }
    }

    // This populates the available options for select role levels to assign
    function PopulateRoleLevels() {
        var grantor = $scope.admin.administrator;
        grantor.permissionsList = authFactory.getPermissions();
        grantor.affiliateAllowed = false;
        grantor.competitionAllowed = false;
        grantor.divisionsAllowed = {};
        grantor.teamsAllowed = {};
        // First loop through and retrieve all administrator permissions
        for (var index = 0; index < grantor.permissionsList.length; index++) {
            var permission = grantor.permissionsList[index];
            // Administrator bit set?
            if (permission.mask && 2) {
                switch (permission.level) {
                    case "league":
                        grantor.affiliateAllowed = true;
                        break;
                    case "season":
                        grantor.competitionAllowed = true;
                        break;
                    case "division":
                        grantor.divisionsAllowed[permission.id] = true;
                        break;
                    case "team":
                        grantor.teamsAllowed[permission.id] = true;
                        break;
                }
            }
        }
        // Next we would loop through each team and allow or disallow it.
        for (var index = 0; index < grantor.teams.length; index++) {
            var team = grantor.teams[index];
            if (grantor.affiliateAllowed || grantor.competitionAllowed) team.allowed = true;
            if (grantor.teamsAllowed[team.teamId]) team.allowed = true;
            if (grantor.divisionsAllowed[team.divisionId]) team.allowed = true;
        }
        grantor.level = "team";
        grantor.setLevel();
    }

    function PopulatePermissions() {

        // Don't even bother unless the level filter has been set
        if (!$scope.admin.administrator.level) return;

        $scope.admin.player.permissions.affiliate = [];
        $scope.admin.player.permissions.competition = [];
        $scope.admin.player.permissions.division = [];
        $scope.admin.player.permissions.team = [];
        var permArray = null;
        var applyMask = 0;

        // Loop through all current roles assigne for player
        for (var index = 0; index < $scope.admin.player.roles.length; index++) {
            var role = $scope.admin.player.roles[index];
            // Must match currently show level and selections
            if (role.discriminator != $scope.admin.administrator.level) continue;
            switch (role.discriminator) {
                case "affiliate":
                    permArray = $scope.admin.player.permissions.affiliate;
                    applyMask = role.mask;
                    break;
                case "competition":
                    permArray = $scope.admin.player.permissions.competition;
                    applyMask = role.mask;
                    break;
                case "division":
                    // TODO: What is selected division Id?
                    if (role.scopeId == $scope.admin.administrator.divisionId) {
                        permArray = $scope.admin.player.permissions.division;
                        applyMask = role.mask;
                    }
                    break;
                case "team":
                    // TODO: What is selected team Id?
                    if (role.scopeId == $scope.admin.administrator.teamId) {
                        permArray = $scope.admin.player.permissions.team;
                        applyMask = role.mask;
                    }
                    break;
            }
            if (permArray != null) {
                for (var iBit = 0; iBit < 6; iBit++) {
                    if (applyMask & Math.pow(2, iBit)) {
                        permArray[iBit] = 1;
                    } else {
                        permArray[iBit] = 0;
                    }
                }
                // Found one and only applicable role entry
                return;
            }
        }
    }

    function MakeMask(bitArray) {
        var mask = 0;
        for (var i = 0; i < bitArray.length; i++) {
            if (bitArray[i] > 0) mask |= Math.pow(2, i);
        }
        return mask;
    }

    // Content Management Functions

    // If both the library and blogList have loaded, we are ready to proceed
    function PrepareBlogList() {
        if (dataFactory.content.library && !$scope.admin.content.blogListUpdated) {
            // Create Cloned copies of the library and bloglist
            //$scope.admin.content.library = JSON.parse(JSON.stringify(dataFactory.content.library));
            $scope.admin.content.library = JSON.parse(angular.toJson(dataFactory.content.library));

            // First sort the list by recency, then create the blogList
            $scope.admin.content.library.sort(function (a, b) { return (b.dateTime < a.dateTime) ? -1 : 1; });
            $scope.admin.content.blogList = dataFactory.createBlogList($scope.admin.content.library)

            // Initialize the blog list
            // We will also fix any numbering issues with the blog
            $scope.admin.content.setTab(0);
            RenumberBlog();         // Fixes corrupted ordering
            $scope.admin.content.blogListUpdated = true;
        }
    }

    // When we have saved some changes, we want to reload everything and start fresh
    function RefreshContentInfo() {
        $scope.admin.content.blogListUpdated = false;
        $scope.admin.content.library = [];
        dataFactory.loadContentLibrary($scope.admin.content, false);
    }

    // Something in the blog order has changed, so readjust the numbers of all blog items
    // This needs to update the library as well
    function RenumberBlog() {
        var blogList = $scope.admin.content.blogList;
        for (var iPage = 0; iPage < blogList.length; iPage++) {
            var blogPage = blogList[iPage];
            var newIndex = 0;
            for (var index = 0; index < blogPage.length; index++) {
                var item = blogPage[index];
                if (item != undefined) {
                    item.blogPage = iPage + 1;
                    item.pageIndex = newIndex++;
                }
            }
        }
        // Re-create the blog list after any changes
        $scope.admin.content.blogList = dataFactory.createBlogList($scope.admin.content.library)
        $scope.admin.content.setTab($scope.admin.content.tabPage);
    }

});