app.controller('mediaController', function ($scope, dataFactory) {

    Utilities.log("Loading mediaController...");

    $scope.myInterval = 5000;
    $scope.noWrapSlides = false;
    var slides = $scope.slides = [];

    // *** MarketPlace ***
    $scope.marketAds = null;

    // TODO - separate market from media functions
    dataFactory.getMarketAds($scope);

    $scope.addSlide = function (i) {
        var photoName = 'img/photos/' + i + '.jpg';
        Utilities.log("Adding photo <" + photoName + ">")
        slides.push({
            image: photoName,
            text: 'Name the player',
            id: i
        });
    };

    for (var i = 0; i < 16; i++) {
        $scope.addSlide(i);
    }
});

// Additional controller just for handling interactions with braintree
// ===================================================================

app.controller('billingController', function ($scope, $route, $location, authFactory) {

    Utilities.log("Loading billingController...");
    $scope.controllerName = "billingController" // for batarang debugging
    $scope.controllerId = Math.floor((Math.random() * 10000) + 1); // for debugging
    $scope.objType = "$scope";

    $scope.callDebug = function () {
        // temp hook for setting breakpoint
        Utilities.log("...callDebug...");
    }

    // This controller handles billing transactions.
    $scope.billing = authFactory.billing;
    $scope.billing.mode = "dropin"; // Until we can get custom working

    // --- The credit card processing flow is as follows: ---
    // When a credit payment is requested, <PrepareCredit> is called.
    // <PrepareCredit> creates the ticket and makes asynch call to .getSecurityToken.
    // .getSecurityToken. returns =tokenResult= and, if successful, calls <PrepareNonce>
    // <PrepareNonce> calls Braintree _setup_, initializes the payment interface, and
    //      waits for the user to fill out form and submit payment. Upon submission
    //      the anonymous _onPaymentMethodReceived_ function calls .submitPayment.
    //      If initialization fails, process stops with error message.
    // .submitPayment. returns =paymentResult= and calls <ProcessCreditPayment> to fill
    //      out the remainder of ticket items.
    // <ProcessCreditPayment> calls <ProcessTicket> to enter into "transaction" and
    //      "registration_event" tables.
    // <ProcessTicket> calls .processTicket. to save data and return =ticketResult=
    // Upon successful completion, page refreshes to updated registration page.

    // We trigger initialization by watching authFactory property
    $scope.$watch('billing.showPay', function (newValue, oldValue) {
        // for some reason, oldValue may be true, so check elsewhere
        if (newValue) {
            // Initiate the ticket and start the asynchronous process.
            if (!authFactory.billing.creditPrepared) {
                authFactory.billing.creditPrepared = true;
                PrepareCredit();
            }
        }
    });

    // Watches set to follow asynchronous processing flow
    // When the PrepareCredit call returns, first step is to recover token

    $scope.$watch('billing.tokenResult', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            if ($scope.billing.tokenResult.error) {
                // Without a token, we can't proceed, so just bail
                $scope.billing.error = "Could not obtain token. Error = " + $scope.billing.tokenResult.error;
            } else {
                // Ready to move on to next step
                $scope.billing.token = $scope.billing.tokenResult.token;
                PrepareNonce();
            }
        }
    });

    // When the ProcessTicket call returns, retrieve results and provide feedback.
    $scope.$watch('billing.paymentResult', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            if ($scope.billing.paymentResult.error) {
                // We still need to record failed payment
                $scope.billing.error = "Payment Processing Failed: Reason = " + $scope.billing.ticketResult.error;
                $scope.billing.processing = false;
            } else {
                // Success: Save the transaction info. (or was this done already?)
                ProcessCreditPayment($scope.billing.paymentResult.details);
                $scope.billing.paymentSuccess = true;
            }
            
        }
    });

    // When the ProcessTicket call returns, retrieve results and provide feedback.
    $scope.$watch('billing.ticketResult', function (newValue, oldValue) {
        if (newValue && newValue != oldValue) {
            if ($scope.billing.ticketResult.error) {
                $scope.billing.error = "Ticket Processing Failed: Reason = " + $scope.billing.ticketResult.error;
            } else {
                // Everything processed, but a credit card transaction may have been rejected.
                // Success: Provide a confirmation message.
                if (!$scope.billing.ticket.success) {
                    var error = "TRANSACTION FAILED: Reason = " + $scope.billing.ticket.processorResponseText;
                    error += ", Code = " + $scope.billing.ticket.processorResponseCode + "\n";
                    error += "The credit card payment failed. You may try again if you like.";
                    $scope.billing.error = error;
                    // Reset the payment window.
                    $scope.billing.checkout.teardown(function () {
                        $scope.billing.checkout = null;
                        // braintree.setup can safely be run again!
                    });
                    PrepareNonce();
                } else {
                    var confirm = $scope.billing.ticketResult.confirm;
                    $scope.billing.confirm = md_to_html(confirm);;
                    if ($scope.billing.onSuccess == "reload") {
                        authFactory.billing.showPay = false;
                        $route.reload();
                    } else if ($scope.billing.onSuccess == "showReg") {
                        authFactory.billing.showPay = false;
                        $location.path("/registration");
                    }
                }
            }
        }
    });

    // ------- Ticket processing functions --------

    $scope.billing.applyTo = function () {
        var index = $scope.billing.selectedEvent;
        $scope.billing.appliesToEvent = null;
        if (index >= 0) $scope.billing.appliesToEvent = $scope.billing.applyList[index].eventId;
    }

    $scope.billing.processCash = function () {
        var ticket = {};
        ticket.method = $scope.billing.method;
        ticket.success = 1;
        ticket.status = "approved";
        ticket.orderId = GenerateOrderId($scope.billing.registrationId);
        ticket.applyToEvent = $scope.billing.registerEventId;
        ticket.eventType = "payment";
        ticket.success = true;
        $scope.billing.ticket = ticket;
        ProcessTicket();
    };

    $scope.billing.addFee = function () {
        var ticket = {};
        ticket.method = "fee";
        ticket.applyToEvent = $scope.billing.appliesToEvent;
        ticket.eventType = "fee";
        ticket.success = true;
        $scope.billing.ticket = ticket;
        ProcessTicket();
    };

    $scope.billing.addDeduction = function () {
        var ticket = {};
        ticket.method = "deduction";
        ticket.applyToEvent = $scope.billing.appliesToEvent;
        ticket.eventType = "deduction";
        ticket.success = true;
        $scope.billing.ticket = ticket;
        ProcessTicket();
    };

    function PrepareCredit() {
        //ProcessFakeCredit(); // simulation path
        var ticket = {};
        ticket.method = "credit";
        //ticket.registrationId = from where?
        ticket.applyToEvent = $scope.billing.registerEventId;
        ticket.eventType = "payment";
        $scope.billing.ticket = ticket;
        $scope.billing.orderId = GenerateOrderId($scope.billing.registrationId);
        authFactory.getSecurityToken($scope.billing);
    };

    // Call to Braintree has returned with additional details for the ticket
    function ProcessCreditPayment(details) {
        var ticket = $scope.billing.ticket;
        ticket.success = details.success;
        ticket.provider = "braintree";
        ticket.status = details.status;
        ticket.orderId = details.orderId;
        ticket.gatewayTransactionId = details.transactionId;
        ticket.processorAuthCode = details.processorAuthorizationCode;
        ticket.processorResponseCode = details.processorResponseCode;
        ticket.processorResponseText = details.processorResponseText;
        ProcessTicket();
    }

    function PrepareNonce() {
        // Call braintree library to generate nonce.
        // Updated for Braintree v3 drop-in with disabled PayPal and Venmo options
        if (!$scope.billing.token || $scope.billing.token.trim() === '') {
            $scope.billing.error = 'Invalid or missing client token from server';
            return;
        }
        try {
            braintree.dropin.create({
                authorization: $scope.billing.token,
                container: '#dropin',
                card: {
                    cardholderName: {
                        required: true
                    },
                    overrides: {
                        fields: {
                            cvv: {
                                placeholder: 'CVV'
                            }
                        }
                    }
                },                
                paypal: false,
                venmo: false
            }, function (createErr, dropinInstance) {
                if (createErr) {
                    $scope.$apply(function () {
                        $scope.billing.error = 'Error creating dropin: ' + createErr.message;
                    });
                    return;
                }
                $scope.billing.dropinInstance = dropinInstance;
            });
        } catch (e) {
            $scope.$apply(function () {
                $scope.billing.error = 'Exception creating dropin: ' + e.message;
            });
        }
    }

    $scope.submitPayment = function() {
        if ($scope.billing.processing) { 
            return;
        }
        if (!$scope.billing.dropinInstance) {
            console.error('No dropinInstance found');
            $scope.billing.error = 'Payment form not initialized. Please refresh the page.';
            return;
        }

        $scope.billing.dropinInstance.requestPaymentMethod(function (requestErr, payload) {
            if (requestErr) {
                console.error('Payment method request error:', requestErr);
                $scope.$apply(function () {
                    $scope.billing.processing = false;
                    $scope.billing.error = 'Error requesting payment method: ' + requestErr.message;
                });
                return;
            }
            console.log('Payment method received:', payload);
            $scope.$apply(function () {
                $scope.billing.processing = true;
                var nonce = payload.nonce;
                var firstName = GetFirstName(authFactory.login.userName);
                var lastName = GetLastName(authFactory.login.userName);
                authFactory.submitPayment($scope.billing, nonce, $scope.billing.amount, $scope.billing.orderId, firstName, lastName);
            });
        });
    };

    // ProcessTicket saves the details of all billing operations to the transaction and
    // registration_events database tables
    function ProcessTicket() {
        var billing = $scope.billing;
        var ticket = billing.ticket;
        // Most ticket fields are the same regardless of ticket type
        ticket.payerId = authFactory.login.userId;
        ticket.registrationId = billing.registrationId;
        ticket.year = billing.year;
        ticket.amount = billing.amount;
        ConstructComment(ticket);
        billing.error = "";
        billing.confirm = "";
        authFactory.processTicket(billing, ticket);
    }

    function ProcessFakeCredit() {
        // Test routine to bypass CC processing
        var ticket = $scope.billing.ticket;
        ticket.success = 1;
        ticket.response_text = "Approved";
        ticket.provider = "braintree";
        ticket.status = "submitted_for_settlement";
        ticket.gatewayTransactionId = GenerateTransactionId();
        ticket.processorAuthCode = "15403B";
        ticket.processorResponseCode = 1000;
        ticket.processorResponseText = "Approved";
        ProcessTicket();
    }

    // Utility Routines in support of payment functions

    function GenerateOrderId(registrationId) {
        var timeStamp = Math.floor(Date.now() / 1000);
        return "2-" + registrationId + "-" + timeStamp;
    }

    function GenerateTransactionId() {
        // Temporary test function for simulating credit card processor
        var id = "";
        for (var i = 0; i < 8; i++) {
            var next = Math.floor((Math.random() * 36));
            if (next < 10) {
                id += String.fromCharCode(next + 48);
            } else {
                id += String.fromCharCode(next + 87);
            }
        }
        return id;
    }

    function ConstructComment(ticket) {
        var comment = "";
        // Payment is not specifically allocated to a particular charge, but we will make a best guess as to whether this is a dues payment or something else
        var payFor = "**League Dues**";
        if (ticket.amount < 15000) payFor = "**Miscellaneous Charges**";
        switch (ticket.method) {
            case "credit":
                comment = "#### Payment <small>via Credit Card</small>\n";
                comment += "*Payment&nbsp;for:*&nbsp;" + payFor + " *Order&nbsp;Id:*&nbsp;**" + ticket.orderId + "*\n\n";
                comment += "*Transaction&nbsp;Id:*&nbsp;**" + ticket.gatewayTransactionId + "**";
                break;
            case "cash":
            case "check":
                comment = "#### Payment <small>via " + ticket.method + "</small>\n";
                comment += "*Payment&nbsp;for:*&nbsp;" + payFor + " *Order&nbsp;Id:*&nbsp;**" + ticket.orderId + "*\n\n";
                comment += "*Payment&nbsp;Received&nbsp;By:*&nbsp;**" + authFactory.login.userName + "**";
                break;
            case "fee":
                comment = $scope.billing.comment + "\n\n";
                comment += "*Added by* **" + authFactory.login.userName + "**";
                break;
            case "deduction":
                comment = $scope.billing.comment + "\n\n";
                comment += "*Added by* **" + authFactory.login.userName + "**";
                break;
        }
        ticket.comment = comment;
    }

    function GetFirstName(fullName) {
        var blankPos = fullName.indexOf(" ");
        if (blankPos < 0) return "";
        return fullName.slice(0, blankPos);
    }

    function GetLastName(fullName) {
        var blankPos = fullName.indexOf(" ");
        if (blankPos < 0) return fullName;
        return fullName.slice(blankPos + 1);
    }
});