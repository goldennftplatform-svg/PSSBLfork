app.controller('articleController', function ($scope, $routeParams, $location, $anchorScroll, $timeout, dataFactory, authFactory, $http) {

    Utilities.log("articleController loaded ...");
    $scope.controllerName = "articleController" // for batarang debugging
    $scope.controllerId = Math.floor((Math.random() * 10000) + 1); // for debugging
    $scope.objType = "$scope";

    $scope.callDebug = function () {
        // temp hook for setting breakpoint
        Utilities.log("...callDebug...");
    }

    $scope.article = {};
    $scope.article.type = "article";

    //Use a placeholder that fills some space and avoids a lot of jumping
    $scope.article.html = '<img src="img/loading1.gif" title="Loading" /><div class="row"><canvas width="200" height="1000"></canvas></div>';

    // The articles page displays both articles and messages. They are both loaded from HTML files. The only difference is that an article will
    // have separate Author, Title, and Date fields that are shown as part of a header. Messages are shown as is.

    var contentId = $routeParams.contentId;
    var category = "article";
    var hash = $location.hash();

    // It's possible that URL got mangled and contentId and hash were combined. If so, break apart
    if (contentId) {
        var hashMark = contentId.indexOf("#");
        if (hashMark > 0) {
            hash = contentId.substr(hashMark + 1);
            contentId = contentId.substr(0, hashMark);
        }
    }

    if ($routeParams.messageId) {
        category = "message";
        contentId = $routeParams.messageId;
    }

    if ($routeParams.hash) {
        hash = $routeParams.hash;
    }

    // We need library to be loaded. It may have already been loaded, which is fine;
    // it will be loaded from cache in that case.
    dataFactory.loadContentLibrary($scope.article, true);


    // Once the content has been loaded, we scroll to the anchor point if provided
    // Triggered by libraryLoaded going from false to true.
    $scope.$watch('article.libraryLoaded', function (newValue, oldValue) {
        if (newValue) {
            LoadContent();
        }
    });

    // We also need a watch on the completion of the article loading
    // so that we can scroll to an anchor if necessary.  We need to wait a bit using
    // $timer, or the scroll will not happen
    $scope.$watch('article.html', function (newValue, oldValue) {
        if (newValue) {
            if (hash) {
                $timeout(function () {
                    $anchorScroll(hash);;
                }, 100);               
            }
        }
    });

    // Local Functions

    function LoadContent() {

        // If there are not $routeParams specified, we must have gotten here from the content editor.
        // We do not load the page from a file in the case
        if (!contentId) {
            $scope.article = authFactory.admin.content.editItem;
        } else {
            if (category == "message") {
                $scope.article.type = "message";
                dataFactory.getMessageHtml($scope.article, contentId);
            } else {
                // Get metadata from library - if it is not in the library,
                // load it anyway without descriptors
                $scope.article = dataFactory.getArticleInfo(contentId);
                if (!$scope.article) {
                    $scope.article = {};
                    $scope.article.type = "document";
                }
                dataFactory.getArticleHtml($scope.article, contentId);
            }
        }
    }

});
