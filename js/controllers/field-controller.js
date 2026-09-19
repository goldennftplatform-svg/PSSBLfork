app.controller('fieldController', function ($scope, $routeParams, dataFactory, scheduleFactory, commFactory, authFactory) {

   Utilities.log("Loading fieldController...");

    // Initialize variables
    $scope.controllerName = "fieldController" // for batarang debugging
    $scope.itemsPerPage = 20;
    $scope.currentPage = 1;
    $scope.maxPages = 8;
    $scope.currentYear = undefined;
    $scope.loadingData = false;

    $scope.field = {};

    // To be loaded
    $scope.fields = null;
    $scope.fieldCount = undefined;
    $scope.currentField = undefined;
    $scope.currentFieldId = undefined;
    $scope.currentFieldMap = undefined;
    $scope.recentGames = null;
    $scope.upcomingGames = null;

    // Handles both field list and field detail pages

    $scope.currentFieldId = $routeParams.fieldId;
    if ($scope.currentFieldId) {    // --- field detail
        scheduleFactory.getCurrentYear($scope);
        // Utilities.log($scope.currentFieldId);
        GetFieldInfo();
        scheduleFactory.getGames($scope, {
            page: "0", perPage: "10",
            scheduleType: "league",
            fieldId: $scope.currentFieldId,
            restrict: "Recent"
        });
        scheduleFactory.getGames($scope, {
            page: "0", perPage: "10",
            scheduleType: "league",
            fieldId: $scope.currentFieldId,
            restrict: "Upcoming"
        });
    } else {                        // --- field list
        GetFieldCount();
        GetFields();
    }

    // These functions are specific to the field list display
    $scope.setPerPage = function (value) {
        $scope.itemsPerPage = value;
        $scope.currentPage = 1;
        GetFields();
        if ($scope.itemsPerPage < 0) {
            $scope.itemsPerPage = $scope.fieldCount;
        }
    }

    $scope.pageChanged = function () {
       Utilities.log("Calling field:pageChanged");
        GetFields();
    }

    // Specific to the field detail display

    $scope.hasLights = function (lights) {
        return (lights == 1) ? "Yes" : "No";
    }

    //  Adding new Functions
    //  **************CLEAN UP AND DELETE UNUSED FUNCTIONS BEFORE PUBLISH**********
    //  Check for Admin priviliges to allow edits
    //  Check for GM priviliges  to allowing viewing confidential fields
    $scope.isAdmin = function () {
        return authFactory.login.isAdmin;
    }

    $scope.isGM = function () {
        return authFactory.isGM($scope);
    }

    $scope.editField = function () {
        $scope.field.canEdit = true;
        GetFieldProviders();
    }

    $scope.cancelEdit = function () {
        // Does this handle cancel edit for new field?
        GetFieldInfo();
        $scope.field.canEdit = false;
    }

    $scope.addField = function() {
        $scope.field.canEdit = true;
        $scope.fieldInfo = {};
        $scope.currentFieldId = -1;
        // Probably should do some more initializing here
    }

    $scope.saveField = function () {
        $scope.field.canEdit = false;
        $scope.fieldInfo.fieldId = $scope.currentFieldId;
        authFactory.saveField($scope.field, $scope.fieldInfo);
        // Should disable Edit and Save buttons until server call returns?
        // Might also add loading animation
    }

    //  Save Existing Field returns:  echo '[{"status":"success"}]'; <-- NO
    //  Save New Field returns:  echo '[{"result":"success", "fieldId":' . $field_id . '}]';
    $scope.$watch('field.result', function (newValue, oldValue) {
        if (newValue && !oldValue) {
            if ($scope.field.result.error) {
                $scope.field.error = $scope.field.result.error;
            } else {
                // This should work after saving a new field, but will not reload the page after saving an edited
                // field, since the url is identical
                //$location.path("/fields/" + $scope.field.result.fieldId);

                // *** Instead, just reload the field info
                $scope.currentFieldId = $scope.field.result.fieldId;
                GetFieldInfo();
            }
        }
    });

    // Local Functions

    function GetFieldCount() {
        dataFactory.getFieldCount($scope);
    }

    function GetFields() { // (callingScope, page, perPage, fieldId)
        dataFactory.getFields($scope, ($scope.currentPage - 1), $scope.itemsPerPage, $scope.currentFieldId);
    }

    function GetFieldInfo() {
        dataFactory.getFieldInfo($scope, $scope.currentFieldId);
    }
    function GetFieldProviders () {
        dataFactory.getFieldProviders($scope);
    }

});
