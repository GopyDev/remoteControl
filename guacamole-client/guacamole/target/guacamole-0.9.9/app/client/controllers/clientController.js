/*
 * Copyright (C) 2014 Glyptodon LLC
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * The controller for the page used to connect to a connection or balancing group.
 */
angular.module('client').controller('clientController', ['$scope', '$routeParams', '$injector',
        function clientController($scope, $routeParams, $injector) {

    // Required types
    var ManagedClient      = $injector.get('ManagedClient');
    var ManagedClientState = $injector.get('ManagedClientState');
    var ManagedFilesystem  = $injector.get('ManagedFilesystem');
    var ScrollState        = $injector.get('ScrollState');
    var Fullscreen         = $injector.get('Fullscreen');
    var $document          = $injector.get('$document');

    // Required services
    var $location             = $injector.get('$location');
    var $route                = $injector.get('$route');
    var authenticationService = $injector.get('authenticationService');
    var clipboardService      = $injector.get('clipboardService');
    var guacClientManager     = $injector.get('guacClientManager');
    var guacNotification      = $injector.get('guacNotification');
    var preferenceService     = $injector.get('preferenceService');
    var userPageService       = $injector.get('userPageService');

    /*
    *Launch the modal for file transfer
    */
    //== Methods ==//
    var filetransfermodal = null;
    $scope.launch = function(){
        filetransfermodal= $('#filesystem-menu').modal();
        if ($scope.menu.shown)
            $scope.menu.shown = false;
    }; // end launch

    /*
    *Close menu function
    */
    $scope.menuclose = function(){
        if ($scope.menu.shown)
            $scope.menu.shown = false;
        $('.newmenu').css('display', 'block');
    }; // end launch

    /**
     * The minimum number of pixels a drag gesture must move to result in the
     * menu being shown or hidden.
     *
     * @type Number
     */
    var MENU_DRAG_DELTA = 60;

    /**
     * The maximum X location of the start of a drag gesture for that gesture
     * to potentially show the menu.
     *
     * @type Number
     */
    var MENU_DRAG_MARGIN = 60;

    /**
     * When showing or hiding the menu via a drag gesture, the maximum number
     * of pixels the touch can move vertically and still affect the menu.
     * 
     * @type Number
     */
    var MENU_DRAG_VERTICAL_TOLERANCE = 10;

    /**
     * The minimum number of pixels a drag gesture must move to result in the
     * menu being shown or hidden.
     *
     * @type Number
     */
    var currentUrl = $location.path();

    var mouseMoveState = false;

    var mouseDownState = false;

    var mouseOutState = false;
    /*
     * In order to open the guacamole menu, we need to hit ctrl-alt-shift. There are
     * several possible keysysms for each key.
     */
    var SHIFT_KEYS  = {0xFFE1 : true, 0xFFE2 : true},
        ALT_KEYS    = {0xFFE9 : true, 0xFFEA : true, 0xFE03 : true,
                       0xFFE7 : true, 0xFFE8 : true},
        CTRL_KEYS   = {0xFFE3 : true, 0xFFE4 : true},
        MENU_KEYS   = angular.extend({}, SHIFT_KEYS, ALT_KEYS, CTRL_KEYS);

    /**
     * All client error codes handled and passed off for translation. Any error
     * code not present in this list will be represented by the "DEFAULT"
     * translation.
     */
    var CLIENT_ERRORS = {
        0x0201: true,
        0x0202: true,
        0x0203: true,
        0x0205: true,
        0x0301: true,
        0x0303: true,
        0x0308: true,
        0x031D: true
    };

    /**
     * All error codes for which automatic reconnection is appropriate when a
     * client error occurs.
     */
    var CLIENT_AUTO_RECONNECT = {
        0x0200: true,
        0x0202: true,
        0x0203: true,
        0x0301: true,
        0x0308: true
    };
 
    /**
     * All tunnel error codes handled and passed off for translation. Any error
     * code not present in this list will be represented by the "DEFAULT"
     * translation.
     */
    var TUNNEL_ERRORS = {
        0x0201: true,
        0x0202: true,
        0x0203: true,
        0x0204: true,
        0x0205: true,
        0x0301: true,
        0x0303: true,
        0x0308: true,
        0x031D: true
    };
 
    /**
     * All error codes for which automatic reconnection is appropriate when a
     * tunnel error occurs.
     */
    var TUNNEL_AUTO_RECONNECT = {
        0x0200: true,
        0x0202: true,
        0x0203: true,
        0x0308: true
    };

    /**
     * Action which logs out from Guacamole entirely.
     */
    var LOGOUT_ACTION = {
        name      : "CLIENT.ACTION_LOGOUT",
        className : "logout button",
        callback  : function logoutCallback() {
            authenticationService.logout()['finally'](function logoutComplete() {
                $location.url('/');
            });
        }
    };

    $scope.logout = function logout() {
        authenticationService.logout()['finally'](function logoutComplete() {
            $location.url('/');
        });
    };

    /**
    *Action which refresh on Web connect application
    */
    $scope.reloadCtrl = function(){
        $route.reload();
    }
    /**
    *Action which fullscreen on Web connect application
    */
    $scope.goFullscreen = function() {
        // Fullscreen
        if (Fullscreen.isEnabled()){
            Fullscreen.cancel();
        }
        else
            Fullscreen.all();
        if ($scope.menu.shown)
            $scope.menu.shown = false;
    };

    $scope.isFullScreen = false;

    $scope.goFullScreenViaWatcher = function() {
        $scope.isFullScreen = !$scope.isFullScreen;
    };


    /**
     * Action which returns the user to the home screen. If the home page has
     * not yet been determined, this will be null.
     */
    var NAVIGATE_HOME_ACTION = null;

    // Assign home page action once user's home page has been determined
    userPageService.getHomePage()
    .then(function homePageRetrieved(homePage) {

        // Define home action only if different from current location
        if ($location.path() !== homePage.url) {
            NAVIGATE_HOME_ACTION = {
                name      : "CLIENT.ACTION_NAVIGATE_HOME",
                className : "home button",
                callback  : function navigateHomeCallback() {
                    $location.url(homePage.url);
                }
            };
        }

    });

    /**
     * Action which replaces the current client with a newly-connected client.
     */
    var RECONNECT_ACTION = {
        name      : "CLIENT.ACTION_RECONNECT",
        className : "reconnect button",
        callback  : function reconnectCallback() {
            $scope.client = guacClientManager.replaceManagedClient($routeParams.id, $routeParams.params);
            guacNotification.showStatus(false);
        }
    };

    /**
     * The reconnect countdown to display if an error or status warrants an
     * automatic, timed reconnect.
     */
    var RECONNECT_COUNTDOWN = {
        text: "CLIENT.TEXT_RECONNECT_COUNTDOWN",
        callback: RECONNECT_ACTION.callback,
        remaining: 15
    };

    /**
     * Menu-specific properties.
     */

    $scope.menu = {

        /**
         * Whether the menu is currently shown.
         *
         * @type Boolean
         */
        shown : false,

        /**
         * Whether the Guacamole display should be scaled to fit the browser
         * window.
         *
         * @type Boolean
         */
        autoFit : true,

        /**
         * The currently selected input method. This may be any of the values
         * defined within preferenceService.inputMethods.
         *
         * @type String
         */
        inputMethod : preferenceService.preferences.inputMethod,

        /**
         * The current scroll state of the menu.
         *
         * @type ScrollState
         */
        scrollState : new ScrollState(),
        /**
         * variable to show screenshout of uploaded files
         *
         * value Boolean
         */
    };

    /*
    * switching between new menu and main menu.
    *
    */
    $scope.mousemove = function mousemove() {
        if (mouseDownState){
            mouseDownState = false;
            mouseMoveState = true;
        }
    };

    $scope.mousedown = function mousedown() {
        mouseDownState = true;
    };

    $scope.mouseout = function mouseout() {
        mouseOutState = true;
    };

    $scope.switching = function switching() {
        if (mouseDownState && mouseOutState){
            mouseOutState = false;
            if(!$scope.menu.shown){
                $scope.menu.shown = true;
                $('.newmenu').css('display', 'none');
            }
        }

        if (mouseMoveState){
            mouseMoveState = false;
            return;
        }

        if (mouseDownState)
            mouseDownState = false;

        if(!$scope.menu.shown){
            $scope.menu.shown = true;
            $('.newmenu').css('display', 'none');
        }
    };

    /*
    * Help screen
    *
    */
    $scope.helpbutton = function(){
        $('#help-dialog').modal();
        if($scope.menu.shown)
            $scope.menu.shown = false;
    };

    $scope.gotohome = function gotohome() {
        $('#help-content').html('<div class="catlist" id="help-openmenu"'+
             'onclick="helpopenmenu()">'+
            '<h4>1. How to open menu.</h4>'+
        '</div>'+
        '<div class="catlist" id="help-downfile" onclick="helpdownload()">'+
            '<h4>2. How to download files.</h4>'+
        '</div>'+
        '<div class="catlist" id="help-upfile" onclick="helpupload()">'+
            '<h4>3. How to upload files.</h4>'+
        '</div>'+
        '<div class="catlist" id="help-copypaste" onclick="helpcopypaste()">'+
            '<h4>4. How to copy/paste.</h4>'+
        '</div>'+
        '<div class="catlist" id="help-print" onclick="helpprint()">'+
            '<h4>5. How to print.</h4>'+
        '</div>'+
        '<script type="text/javascript">'+
            'function helpopenmenu() {'+
                '$(\'#help-content\').html(\'<iframe src="images/static_html/help/menu/main.html" style="width:680px;height:420px;" scrolling="no" frameborder=0></iframe>\');'+
            '};'+
            'function helpdownload() {'+
                '$(\'#help-content\').html(\'<iframe src="images/static_html/help/download/main.html" style="width:680px;height:420px;" scrolling="no" frameborder=0></iframe>\');'+
            '};'+

            'function helpupload() {'+
                '$(\'#help-content\').html(\'<iframe src="images/static_html/help/upload/main.html" style="width:680px;height:420px;" scrolling="no" frameborder=0></iframe>\');'+
            '};'+

            'function helpcopypaste() {'+
                'var nAgt = navigator.userAgent;' + 
                'if ((nAgt.indexOf("Chrome"))!=-1) {' +
                    'if (typeof chrome !== "undefined") {'+
                        'var ce = "chrome-extension://npeefbcdhnfpefakhdpljllcbpegkopl/public/execCommand.js";'+
                        '$.get(ce, function( data ) {'+
                            '$(\'#help-content\').html(\'<iframe src="images/static_html/help/copy-paste/main.html" style="width:680px;height:420px;" scrolling="no" frameborder=0></iframe>\');'+
                        '})'+
                        '.fail(function() {'+
                            '$(\'#help-content\').html(\'<iframe src="images/static_html/help/copy-paste/doinstall.html" style="width:680px;height:420px;" scrolling="no" frameborder=0></iframe>\');' +
                        '});'+
                    '}'+
                '}' +
                'else'+
                    '{$(\'#help-content\').html(\'<iframe src="images/static_html/help/copy-paste/notavailable.html" style="width:680px;height:420px;" scrolling="no" frameborder=0></iframe>\');}' +
            '};'+
            'function helpprint() {'+
                '$(\'#help-content\').html(\'<iframe src="images/static_html/help/print/main.html" style="width:680px;height:420px;" scrolling="no" frameborder=0></iframe>\');'+
            '};'+
        '</script>');
    };

    $scope.helpopenmenu = function helpopenmenu() {
        $('#help-content').html('<iframe src="images/static_html/help/menu/main.html" style="width:680px;height:420px;" scrolling="no" frameborder=0></iframe>');
    };

    $scope.helpdownload = function helpdownload() {
        $('#help-content').html('<iframe src="images/static_html/help/download/main.html" style="width:680px;height:420px;" scrolling="no" frameborder=0></iframe>');
    };

    $scope.helpupload = function helpupload() {
        $('#help-content').html('<iframe src="images/static_html/help/upload/main.html" style="width:680px;height:420px;" scrolling="no" frameborder=0></iframe>');
    };

    $scope.helpcopypaste = function helpcopypaste() {

        var nAgt = navigator.userAgent;
        if ((nAgt.indexOf("Chrome"))!=-1) {
            if (typeof chrome !== "undefined") {
                var ce = "chrome-extension://npeefbcdhnfpefakhdpljllcbpegkopl/public/execCommand.js"; 
                $.get(ce, function( data ) {
                    $('#help-content').html('<iframe src="images/static_html/help/copy-paste/main.html" style="width:680px;height:420px;" scrolling="no" frameborder=0></iframe>');
                })
                .fail(function() {
                    $('#help-content').html('<iframe src="images/static_html/help/copy-paste/doinstall.html" style="width:680px;height:420px;" scrolling="no" frameborder=0></iframe>');
                });
            }
        }
        else
            $('#help-content').html('<iframe src="images/static_html/help/copy-paste/notavailable.html" style="width:680px;height:420px;" scrolling="no" frameborder=0></iframe>');
    };

    $scope.helpprint = function helpprint() {
        $('#help-content').html('<iframe src="images/static_html/help/print/main.html" style="width:680px;height:420px;" scrolling="no" frameborder=0></iframe>');
    };

    // Convenience method for closing the menu
    $scope.closeMenu = function closeMenu() {
        $scope.menu.shown = false;
    };

    /**
     * The client which should be attached to the client UI.
     *
     * @type ManagedClient
     */
    $scope.client = guacClientManager.getManagedClient($routeParams.id, $routeParams.params);

    /**
     * Map of all currently pressed keys by keysym. If a particular key is
     * currently pressed, the value stored under that key's keysym within this
     * map will be true. All keys not currently pressed will not have entries
     * within this map.
     *
     * @type Object.<Number, Boolean>
     */
    var keysCurrentlyPressed = {};

    /**
     * Map of all currently pressed keys (by keysym) to the clipboard contents
     * received from the remote desktop while those keys were pressed. All keys
     * not currently pressed will not have entries within this map.
     *
     * @type Object.<Number, String>
     */
    var clipboardDataFromKey = {};

    /*
     * Check to see if all currently pressed keys are in the set of menu keys.
     */  
    function checkMenuModeActive() {
        for(var keysym in keysCurrentlyPressed) {
            if(!MENU_KEYS[keysym]) {
                return false;
            }
        }
        
        return true;
    }

    // Hide menu when the user swipes from the right
    $scope.menuDrag = function menuDrag(inProgress, startX, startY, currentX, currentY, deltaX, deltaY) {

        // Hide menu if swipe gesture is detected
        if (Math.abs(currentY - startY)  <  MENU_DRAG_VERTICAL_TOLERANCE
                  && startX   - currentX >= MENU_DRAG_DELTA)
            $scope.menu.shown = false;

        // Scroll menu by default
        else {
            $scope.menu.scrollState.left -= deltaX;
            $scope.menu.scrollState.top -= deltaY;
        }

        return false;

    };

    // Update menu or client based on dragging gestures
    $scope.clientDrag = function clientDrag(inProgress, startX, startY, currentX, currentY, deltaX, deltaY) {

        // Show menu if the user swipes from the left
        if (startX <= MENU_DRAG_MARGIN) {

            if (Math.abs(currentY - startY) <  MENU_DRAG_VERTICAL_TOLERANCE
                      && currentX - startX  >= MENU_DRAG_DELTA)
                $scope.menu.shown = true;

        }

        // Scroll display if absolute mouse is in use
        else if ($scope.client.clientProperties.emulateAbsoluteMouse) {
            $scope.client.clientProperties.scrollLeft -= deltaX;
            $scope.client.clientProperties.scrollTop -= deltaY;
        }

        return false;

    };

    /**
     * If a pinch gesture is in progress, the scale of the client display when
     * the pinch gesture began.
     *
     * @type Number
     */
    var initialScale = null;

    /**
     * If a pinch gesture is in progress, the X coordinate of the point on the
     * client display that was centered within the pinch at the time the
     * gesture began.
     * 
     * @type Number
     */
    var initialCenterX = 0;

    /**
     * If a pinch gesture is in progress, the Y coordinate of the point on the
     * client display that was centered within the pinch at the time the
     * gesture began.
     * 
     * @type Number
     */
    var initialCenterY = 0;

    // Zoom and pan client via pinch gestures
    $scope.clientPinch = function clientPinch(inProgress, startLength, currentLength, centerX, centerY) {

        // Do not handle pinch gestures while relative mouse is in use
        if (!$scope.client.clientProperties.emulateAbsoluteMouse)
            return false;

        // Stop gesture if not in progress
        if (!inProgress) {
            initialScale = null;
            return false;
        }

        // Set initial scale if gesture has just started
        if (!initialScale) {
            initialScale   = $scope.client.clientProperties.scale;
            initialCenterX = (centerX + $scope.client.clientProperties.scrollLeft) / initialScale;
            initialCenterY = (centerY + $scope.client.clientProperties.scrollTop)  / initialScale;
        }

        // Determine new scale absolutely
        var currentScale = initialScale * currentLength / startLength;

        // Fix scale within limits - scroll will be miscalculated otherwise
        currentScale = Math.max(currentScale, $scope.client.clientProperties.minScale);
        currentScale = Math.min(currentScale, $scope.client.clientProperties.maxScale);

        // Update scale based on pinch distance
        $scope.menu.autoFit = false;
        $scope.client.clientProperties.autoFit = false;
        $scope.client.clientProperties.scale = currentScale;

        // Scroll display to keep original pinch location centered within current pinch
        $scope.client.clientProperties.scrollLeft = initialCenterX * currentScale - centerX;
        $scope.client.clientProperties.scrollTop  = initialCenterY * currentScale - centerY;

        return false;

    };

    // Show/hide UI elements depending on input method
    $scope.$watch('menu.inputMethod', function setInputMethod(inputMethod) {

        // Show input methods only if selected
        $scope.showOSK       = (inputMethod === 'osk');
        $scope.showTextInput = (inputMethod === 'text');

    });

    $scope.$watch('menu.shown', function menuVisibilityChanged(menuShown, menuShownPreviousState) {

        // Send clipboard data if menu is hidden
        if (!menuShown && menuShownPreviousState)
            $scope.$broadcast('guacClipboard', 'text/plain', $scope.client.clipboardData);

        // Disable client keyboard if the menu is shown
        $scope.client.clientProperties.keyboardEnabled = !menuShown;

    });

    // Watch clipboard for new data, associating it with any pressed keys
    $scope.$watch('client.clipboardData', function clipboardChanged(data) {

        // Associate new clipboard data with any currently-pressed key
        for (var keysym in keysCurrentlyPressed)
            clipboardDataFromKey[keysym] = data;

    });

    // Track pressed keys, opening the Guacamole menu after Ctrl+Alt+Shift
    //$scope.$on('guacKeydown', function keydownListener(event, keysym, keyboard) {
    //    $scope.$apply(function() {
    //        $scope.menu.shown = !$scope.menu.shown;
    //    });

        // Record key as pressed
        //keysCurrentlyPressed[keysym] = true;   

        /* 
         * If only menu keys are pressed, and we have one keysym from each group,
         * and one of the keys is being released, show the menu. 
         */
        /*
        if(checkMenuModeActive()) {
            var currentKeysPressedKeys = Object.keys(keysCurrentlyPressed);
            
            // Check that there is a key pressed for each of the required key classes
            if(!_.isEmpty(_.pick(SHIFT_KEYS, currentKeysPressedKeys)) &&
               !_.isEmpty(_.pick(ALT_KEYS, currentKeysPressedKeys)) &&
               !_.isEmpty(_.pick(CTRL_KEYS, currentKeysPressedKeys))
            ) {
        
                // Don't send this key event through to the client
                event.preventDefault();
                
                // Reset the keys pressed
                keysCurrentlyPressed = {};
                keyboard.reset();
                
                // Toggle the menu
                $scope.$apply(function() {
                    $scope.menu.shown = !$scope.menu.shown;
                });
            }
        }*/

//    });

    // Update pressed keys as they are released, synchronizing the clipboard
    // with any data that appears to have come from those key presses
    $scope.$on('guacKeyup', function keyupListener(event, keysym, keyboard) {

        // Sync local clipboard with any clipboard data received while this
        // key was pressed (if any)
        var clipboardData = clipboardDataFromKey[keysym];
        if (clipboardData) {
            clipboardService.setLocalClipboard(clipboardData);
            delete clipboardDataFromKey[keysym];
        }

        // Mark key as released
        delete keysCurrentlyPressed[keysym];

    });

    // Update page title when client name is received
    $scope.$watch('client.name', function clientNameChanged(name) {
        $scope.page.title = name;
    });

    /**
     * Displays a notification at the end of a Guacamole connection, whether
     * that connection is ending normally or due to an error. As the end of
     * a Guacamole connection may be due to changes in authentication status,
     * this will also implicitly peform a re-authentication attempt to check
     * for such changes, possibly resulting in auth-related events like
     * guacInvalidCredentials.
     *
     * @param {Notification|Boolean|Object} status
     *     The status notification to show, as would be accepted by
     *     guacNotification.showStatus().
     */
    var notifyConnectionClosed = function notifyConnectionClosed(status) {

        // Re-authenticate to verify auth status at end of connection
        authenticationService.updateCurrentToken($location.search())

        // Show the requested status once the authentication check has finished
        ['finally'](function authenticationCheckComplete() {
            guacNotification.showStatus(status);
        });

    };

    // Show status dialog when connection status changes
    $scope.$watch('client.clientState.connectionState', function clientStateChanged(connectionState) {

        // Hide any existing status
        guacNotification.showStatus(false);

        // Do not display status if status not known
        if (!connectionState)
            return;

        // Build array of available actions
        var actions;
        if (NAVIGATE_HOME_ACTION)
            actions = [ NAVIGATE_HOME_ACTION, RECONNECT_ACTION, LOGOUT_ACTION ];
        else
            actions = [ RECONNECT_ACTION, LOGOUT_ACTION ];

        // Get any associated status code
        var status = $scope.client.clientState.statusCode;

        // Connecting 
        if (connectionState === ManagedClientState.ConnectionState.CONNECTING
         || connectionState === ManagedClientState.ConnectionState.WAITING) {
            guacNotification.showStatus({
                title: "CLIENT.DIALOG_HEADER_CONNECTING",
                text: "CLIENT.TEXT_CLIENT_STATUS_" + connectionState.toUpperCase()
            });
        }

        // Client error
        else if (connectionState === ManagedClientState.ConnectionState.CLIENT_ERROR) {

            // Determine translation name of error
            var errorName = (status in CLIENT_ERRORS) ? status.toString(16).toUpperCase() : "DEFAULT";

            // Determine whether the reconnect countdown applies
            var countdown = (status in CLIENT_AUTO_RECONNECT) ? RECONNECT_COUNTDOWN : null;

            // Show error status
            notifyConnectionClosed({
                className : "error",
                title     : "CLIENT.DIALOG_HEADER_CONNECTION_ERROR",
                text      : "CLIENT.ERROR_CLIENT_" + errorName,
                countdown : countdown,
                actions   : actions
            });

        }

        // Tunnel error
        else if (connectionState === ManagedClientState.ConnectionState.TUNNEL_ERROR) {

            // Determine translation name of error
            var errorName = (status in TUNNEL_ERRORS) ? status.toString(16).toUpperCase() : "DEFAULT";

            // Determine whether the reconnect countdown applies
            var countdown = (status in TUNNEL_AUTO_RECONNECT) ? RECONNECT_COUNTDOWN : null;

            // Show error status
            notifyConnectionClosed({
                className : "error",
                title     : "CLIENT.DIALOG_HEADER_CONNECTION_ERROR",
                text      : "CLIENT.ERROR_TUNNEL_" + errorName,
                countdown : countdown,
                actions   : actions
            });

        }

        // Disconnected
        else if (connectionState === ManagedClientState.ConnectionState.DISCONNECTED) {
            notifyConnectionClosed({
                title   : "CLIENT.DIALOG_HEADER_DISCONNECTED",
                text    : "CLIENT.TEXT_CLIENT_STATUS_" + connectionState.toUpperCase(),
                actions : actions
            });
        }

        // Hide status and sync local clipboard once connected
        else if (connectionState === ManagedClientState.ConnectionState.CONNECTED) {
            if (authenticationService.getStatusLogin() == "isFirstLogin")
                $('#help-dialog').modal();
            $('.newmenu').css('display', 'block');

            // Sync with local clipboard
            clipboardService.getLocalClipboard().then(function clipboardRead(data) {
                $scope.$broadcast('guacClipboard', 'text/plain', data);
            });

            // Hide status notification
            guacNotification.showStatus(false);

        }

        // Hide status for all other states
        else
            guacNotification.showStatus(false);

    });

    $scope.formattedScale = function formattedScale() {
        return Math.round($scope.client.clientProperties.scale * 100);
    };
    
    $scope.zoomIn = function zoomIn() {
        $scope.menu.autoFit = false;
        $scope.client.clientProperties.autoFit = false;
        $scope.client.clientProperties.scale += 0.1;
    };
    
    $scope.zoomOut = function zoomOut() {
        $scope.client.clientProperties.autoFit = false;
        $scope.client.clientProperties.scale -= 0.1;
    };
    
    $scope.changeAutoFit = function changeAutoFit() {
        if ($scope.menu.autoFit && $scope.client.clientProperties.minScale) {
            $scope.client.clientProperties.autoFit = true;
        }
        else {
            $scope.client.clientProperties.autoFit = false;
            $scope.client.clientProperties.scale = 1; 
        }
    };
    
    $scope.autoFitDisabled = function() {
        return $scope.client.clientProperties.minZoom >= 1;
    };

    /**
     * Immediately disconnects the currently-connected client, if any.
     */
    $scope.disconnect = function disconnect() {

        // Disconnect if client is available
        if ($scope.client)
            $scope.client.client.disconnect();

        // Hide menu
        $scope.menu.shown = false;
    };

    /**
     * Action which immediately disconnects the currently-connected client, if
     * any.
     */
    var DISCONNECT_MENU_ACTION = {
        name      : 'CLIENT.ACTION_DISCONNECT',
        className : 'danger disconnect',
        callback  : $scope.disconnect
    };

    // Set client-specific menu actions
    $scope.clientMenuActions = [ DISCONNECT_MENU_ACTION ];

    /**
     * The currently-visible filesystem within the filesystem menu, if the
     * filesystem menu is open. If no filesystem is currently visible, this
     * will be null.
     *
     * @type ManagedFilesystem
     */
    $scope.filesystemMenuContents = null;

    /**
     * Hides the filesystem menu.
     */
    /*$scope.hideFilesystemMenu = function hideFilesystemMenu() {
        $scope.filesystemMenuContents = null;
    };*/

    /**
     * Shows the filesystem menu, displaying the contents of the given
     * filesystem within it.
     *
     * @param {ManagedFilesystem} filesystem
     *     The filesystem to show within the filesystem menu.
     */

    $scope.showFilesystemMenu = function showFilesystemMenu(filesystem) {
        //$scope.filesystemMenuContents = filesystem;
        var oldfilesystem = $scope.filesystemMenuContents;
        if(oldfilesystem){
            ManagedFilesystem.refresh(oldfilesystem, oldfilesystem.currentDirectory);
            $scope.filesystemMenuContents = null;
        }
        $scope.filesystemMenuContents = filesystem;
    };

    /**
     * Returns whether the filesystem menu should be visible.
     *
     * @returns {Boolean}
     *     true if the filesystem menu is shown, false otherwise.
     */
    $scope.isFilesystemMenuShown = function isFilesystemMenuShown() {
        return !!$scope.filesystemMenuContents && $scope.menu.shown;
    };

    // Automatically refresh display when filesystem menu is shown
    $scope.$watch('isFilesystemMenuShown()', function refreshFilesystem() {

        // Refresh filesystem, if defined
        var filesystem = $scope.filesystemMenuContents;
        if (filesystem)
            ManagedFilesystem.refresh(filesystem, filesystem.currentDirectory);
    });

    /**
     * Returns the full path to the given file as an ordered array of parent
     * directories.
     *
     * @param {ManagedFilesystem.File} file
     *     The file whose full path should be retrieved.
     *
     * @returns {ManagedFilesystem.File[]}
     *     An array of directories which make up the hierarchy containing the
     *     given file, in order of increasing depth.
     */
    $scope.getPath = function getPath(file) {

        var path = [];

        // Add all files to path in ascending order of depth
        while (file && file.parent) {
            path.unshift(file);
            file = file.parent;
        }

        return path;
    };

    /**
     * Changes the current directory of the given filesystem to the given
     * directory.
     *
     * @param {ManagedFilesystem} filesystem
     *     The filesystem whose current directory should be changed.
     *
     * @param {ManagedFilesystem.File} file
     *     The directory to change to.
     */
    $scope.changeDirectory = function changeDirectory(filesystem, file) {
        ManagedFilesystem.changeDirectory(filesystem, file);
    };

    /**
     * Begins a file upload through the attached Guacamole client for
     * each file in the given FileList.
     *
     * @param {FileList} files
     *     The files to upload.
     */
    $scope.uploadFiles = function uploadFiles(files) {

        // Ignore file uploads if no attached client
        if (!$scope.client)
            return;

        // Upload each file
        for (var i = 0; i < files.length; i++)
            ManagedClient.uploadFile($scope.client, files[i], $scope.filesystemMenuContents);
        if(filetransfermodal){
            filetransfermodal.close();
        }
    };

    $scope.$on('guacUploadComplete', function uploadComplete(event, filename) {
        $('#uploadcomplete-dialog').modal();
    });
    /**
     * Determines whether the attached client has associated file transfers,
     * regardless of those file transfers' state.
     *
     * @returns {Boolean}
     *     true if there are any file transfers associated with the
     *     attached client, false otherise.
     */
    $scope.hasTransfers = function hasTransfers() {

        // There are no file transfers if there is no client
        if (!$scope.client)
            return false;

        return !!($scope.client.uploads.length || $scope.client.downloads.length);

    };

    $(window).bind('resize', function(e)
    {
        var logged = document.getElementById('content');
        if (logged != null){
          if (window.RT) clearTimeout(window.RT);
          window.RT = setTimeout(function()
          {
            //this.location.reload(true);
            if ($scope.menu.shown)
                $scope.menu.shown = false;
            $scope.client = guacClientManager.replaceManagedClient($routeParams.id, $routeParams.params);
            guacNotification.showStatus(false);
          }, 100);
      }
    });

    // Clean up when view destroyed
    $scope.$on('$destroy', function clientViewDestroyed() {

        // Remove client from client manager if no longer connected
        var managedClient = $scope.client;
        if (managedClient) {

            // Get current connection state
            var connectionState = managedClient.clientState.connectionState;

            // If disconnected, remove from management
            if (connectionState === ManagedClientState.ConnectionState.DISCONNECTED
             || connectionState === ManagedClientState.ConnectionState.TUNNEL_ERROR
             || connectionState === ManagedClientState.ConnectionState.CLIENT_ERROR)
                guacClientManager.removeManagedClient(managedClient.id);
        }

    });

     /*
     * SimpleModal 1.4.4 - jQuery Plugin
     * http://simplemodal.com/
     * Copyright (c) 2013 Eric Martin
     * Licensed under MIT and GPL
     * Date: Sun, Jan 20 2013 15:58:56 -0800
     */
(function(b){"function"===typeof define&&define.amd?define(["jquery"],b):b(jQuery)})(function(b){var j=[],n=b(document),k=navigator.userAgent.toLowerCase(),l=b(window),g=[],o=null,p=/msie/.test(k)&&!/opera/.test(k),q=/opera/.test(k),m,r;m=p&&/msie 6./.test(k)&&"object"!==typeof window.XMLHttpRequest;r=p&&/msie 7.0/.test(k);b.modal=function(a,h){return b.modal.impl.init(a,h)};b.modal.close=function(){b.modal.impl.close()};b.modal.focus=function(a){b.modal.impl.focus(a)};b.modal.setContainerDimensions=
function(){b.modal.impl.setContainerDimensions()};b.modal.setPosition=function(){b.modal.impl.setPosition()};b.modal.update=function(a,h){b.modal.impl.update(a,h)};b.fn.modal=function(a){return b.modal.impl.init(this,a)};b.modal.defaults={appendTo:"body",focus:!0,opacity:50,overlayId:"simplemodal-overlay",overlayCss:{},containerId:"simplemodal-container",containerCss:{},dataId:"simplemodal-data",dataCss:{},minHeight:null,minWidth:null,maxHeight:null,maxWidth:null,autoResize:!1,autoPosition:!0,zIndex:1E3,
close:!0,closeHTML:'<a class="modalCloseImg" title="Close"></a>',closeClass:"simplemodal-close",escClose:!0,overlayClose:!1,fixed:!0,position:null,persist:!1,modal:!0,onOpen:null,onShow:null,onClose:null};b.modal.impl={d:{},init:function(a,h){if(this.d.data)return!1;o=p&&!b.support.boxModel;this.o=b.extend({},b.modal.defaults,h);this.zIndex=this.o.zIndex;this.occb=!1;if("object"===typeof a){if(a=a instanceof b?a:b(a),this.d.placeholder=!1,0<a.parent().parent().size()&&(a.before(b("<span></span>").attr("id",
"simplemodal-placeholder").css({display:"none"})),this.d.placeholder=!0,this.display=a.css("display"),!this.o.persist))this.d.orig=a.clone(!0)}else if("string"===typeof a||"number"===typeof a)a=b("<div></div>").html(a);else return alert("SimpleModal Error: Unsupported data type: "+typeof a),this;this.create(a);this.open();b.isFunction(this.o.onShow)&&this.o.onShow.apply(this,[this.d]);return this},create:function(a){this.getDimensions();if(this.o.modal&&m)this.d.iframe=b('<iframe src="javascript:false;"></iframe>').css(b.extend(this.o.iframeCss,
{display:"none",opacity:0,position:"fixed",height:g[0],width:g[1],zIndex:this.o.zIndex,top:0,left:0})).appendTo(this.o.appendTo);this.d.overlay=b("<div></div>").attr("id",this.o.overlayId).addClass("simplemodal-overlay").css(b.extend(this.o.overlayCss,{display:"none",opacity:this.o.opacity/100,height:this.o.modal?j[0]:0,width:this.o.modal?j[1]:0,position:"fixed",left:0,top:0,zIndex:this.o.zIndex+1})).appendTo(this.o.appendTo);this.d.container=b("<div></div>").attr("id",this.o.containerId).addClass("simplemodal-container").css(b.extend({position:this.o.fixed?
"fixed":"absolute"},this.o.containerCss,{display:"none",zIndex:this.o.zIndex+2})).append(this.o.close&&this.o.closeHTML?b(this.o.closeHTML).addClass(this.o.closeClass):"").appendTo(this.o.appendTo);this.d.wrap=b("<div></div>").attr("tabIndex",-1).addClass("simplemodal-wrap").css({height:"100%",outline:0,width:"100%"}).appendTo(this.d.container);this.d.data=a.attr("id",a.attr("id")||this.o.dataId).addClass("simplemodal-data").css(b.extend(this.o.dataCss,{display:"none"})).appendTo("body");this.setContainerDimensions();
this.d.data.appendTo(this.d.wrap);(m||o)&&this.fixIE()},bindEvents:function(){var a=this;b("."+a.o.closeClass).bind("click.simplemodal",function(b){b.preventDefault();a.close();$route.reload();});a.o.modal&&a.o.close&&a.o.overlayClose&&a.d.overlay.bind("click.simplemodal",function(b){b.preventDefault();a.close()});n.bind("keydown.simplemodal",function(b){a.o.modal&&9===b.keyCode?a.watchTab(b):a.o.close&&a.o.escClose&&27===b.keyCode&&(b.preventDefault(),a.close())});l.bind("resize.simplemodal orientationchange.simplemodal",
function(){a.getDimensions();a.o.autoResize?a.setContainerDimensions():a.o.autoPosition&&a.setPosition();m||o?a.fixIE():a.o.modal&&(a.d.iframe&&a.d.iframe.css({height:g[0],width:g[1]}),a.d.overlay.css({height:j[0],width:j[1]}))})},unbindEvents:function(){b("."+this.o.closeClass).unbind("click.simplemodal");n.unbind("keydown.simplemodal");l.unbind(".simplemodal");this.d.overlay.unbind("click.simplemodal")},fixIE:function(){var a=this.o.position;b.each([this.d.iframe||null,!this.o.modal?null:this.d.overlay,
"fixed"===this.d.container.css("position")?this.d.container:null],function(b,e){if(e){var f=e[0].style;f.position="absolute";if(2>b)f.removeExpression("height"),f.removeExpression("width"),f.setExpression("height",'document.body.scrollHeight > document.body.clientHeight ? document.body.scrollHeight : document.body.clientHeight + "px"'),f.setExpression("width",'document.body.scrollWidth > document.body.clientWidth ? document.body.scrollWidth : document.body.clientWidth + "px"');else{var c,d;a&&a.constructor===
Array?(c=a[0]?"number"===typeof a[0]?a[0].toString():a[0].replace(/px/,""):e.css("top").replace(/px/,""),c=-1===c.indexOf("%")?c+' + (t = document.documentElement.scrollTop ? document.documentElement.scrollTop : document.body.scrollTop) + "px"':parseInt(c.replace(/%/,""))+' * ((document.documentElement.clientHeight || document.body.clientHeight) / 100) + (t = document.documentElement.scrollTop ? document.documentElement.scrollTop : document.body.scrollTop) + "px"',a[1]&&(d="number"===typeof a[1]?
a[1].toString():a[1].replace(/px/,""),d=-1===d.indexOf("%")?d+' + (t = document.documentElement.scrollLeft ? document.documentElement.scrollLeft : document.body.scrollLeft) + "px"':parseInt(d.replace(/%/,""))+' * ((document.documentElement.clientWidth || document.body.clientWidth) / 100) + (t = document.documentElement.scrollLeft ? document.documentElement.scrollLeft : document.body.scrollLeft) + "px"')):(c='(document.documentElement.clientHeight || document.body.clientHeight) / 2 - (this.offsetHeight / 2) + (t = document.documentElement.scrollTop ? document.documentElement.scrollTop : document.body.scrollTop) + "px"',
d='(document.documentElement.clientWidth || document.body.clientWidth) / 2 - (this.offsetWidth / 2) + (t = document.documentElement.scrollLeft ? document.documentElement.scrollLeft : document.body.scrollLeft) + "px"');f.removeExpression("top");f.removeExpression("left");f.setExpression("top",c);f.setExpression("left",d)}}})},focus:function(a){var h=this,a=a&&-1!==b.inArray(a,["first","last"])?a:"first",e=b(":input:enabled:visible:"+a,h.d.wrap);setTimeout(function(){0<e.length?e.focus():h.d.wrap.focus()},
10)},getDimensions:function(){var a="undefined"===typeof window.innerHeight?l.height():window.innerHeight;j=[n.height(),n.width()];g=[a,l.width()]},getVal:function(a,b){return a?"number"===typeof a?a:"auto"===a?0:0<a.indexOf("%")?parseInt(a.replace(/%/,""))/100*("h"===b?g[0]:g[1]):parseInt(a.replace(/px/,"")):null},update:function(a,b){if(!this.d.data)return!1;this.d.origHeight=this.getVal(a,"h");this.d.origWidth=this.getVal(b,"w");this.d.data.hide();a&&this.d.container.css("height",a);b&&this.d.container.css("width",
b);this.setContainerDimensions();this.d.data.show();this.o.focus&&this.focus();this.unbindEvents();this.bindEvents()},setContainerDimensions:function(){var a=m||r,b=this.d.origHeight?this.d.origHeight:q?this.d.container.height():this.getVal(a?this.d.container[0].currentStyle.height:this.d.container.css("height"),"h"),a=this.d.origWidth?this.d.origWidth:q?this.d.container.width():this.getVal(a?this.d.container[0].currentStyle.width:this.d.container.css("width"),"w"),e=this.d.data.outerHeight(!0),f=
this.d.data.outerWidth(!0);this.d.origHeight=this.d.origHeight||b;this.d.origWidth=this.d.origWidth||a;var c=this.o.maxHeight?this.getVal(this.o.maxHeight,"h"):null,d=this.o.maxWidth?this.getVal(this.o.maxWidth,"w"):null,c=c&&c<g[0]?c:g[0],d=d&&d<g[1]?d:g[1],i=this.o.minHeight?this.getVal(this.o.minHeight,"h"):"auto",b=b?this.o.autoResize&&b>c?c:b<i?i:b:e?e>c?c:this.o.minHeight&&"auto"!==i&&e<i?i:e:i,c=this.o.minWidth?this.getVal(this.o.minWidth,"w"):"auto",a=a?this.o.autoResize&&a>d?d:a<c?c:a:f?
f>d?d:this.o.minWidth&&"auto"!==c&&f<c?c:f:c;this.d.container.css({height:b,width:a});this.d.wrap.css({overflow:e>b||f>a?"auto":"visible"});this.o.autoPosition&&this.setPosition()},setPosition:function(){var a,b;a=g[0]/2-this.d.container.outerHeight(!0)/2;b=g[1]/2-this.d.container.outerWidth(!0)/2;var e="fixed"!==this.d.container.css("position")?l.scrollTop():0;this.o.position&&"[object Array]"===Object.prototype.toString.call(this.o.position)?(a=e+(this.o.position[0]||a),b=this.o.position[1]||b):
a=e+a;this.d.container.css({left:b,top:a})},watchTab:function(a){if(0<b(a.target).parents(".simplemodal-container").length){if(this.inputs=b(":input:enabled:visible:first, :input:enabled:visible:last",this.d.data[0]),!a.shiftKey&&a.target===this.inputs[this.inputs.length-1]||a.shiftKey&&a.target===this.inputs[0]||0===this.inputs.length)a.preventDefault(),this.focus(a.shiftKey?"last":"first")}else a.preventDefault(),this.focus()},open:function(){this.d.iframe&&this.d.iframe.show();b.isFunction(this.o.onOpen)?
this.o.onOpen.apply(this,[this.d]):(this.d.overlay.show(),this.d.container.show(),this.d.data.show());this.o.focus&&this.focus();this.bindEvents()},close:function(){if(!this.d.data)return!1;this.unbindEvents();if(b.isFunction(this.o.onClose)&&!this.occb)this.occb=!0,this.o.onClose.apply(this,[this.d]);else{if(this.d.placeholder){var a=b("#simplemodal-placeholder");this.o.persist?a.replaceWith(this.d.data.removeClass("simplemodal-data").css("display",this.display)):(this.d.data.hide().remove(),a.replaceWith(this.d.orig))}else this.d.data.hide().remove();
this.d.container.hide().remove();this.d.overlay.hide();this.d.iframe&&this.d.iframe.hide().remove();this.d.overlay.remove();this.d={}}}}});

}]);
