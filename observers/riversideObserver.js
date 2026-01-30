
class RiversideObserver {
    constructor() {
        this._timer = null;
        this._observer = null;
        this._updateLoops = 0;

        this.isInMeeting = false;
        this.isMuted = false;
        this.isVideoStarted = false;
        this.isShareStarted = false;
        this.isRecordStarted = false;
    };

    initialize = () => {
        // detect whether riverside.fm is the hostname of the page, otherwise do not initialize
        if (!window.location.hostname.endsWith('riverside.fm')) {
            console.log('Not on Riverside page, not initializing RiversideObserver');
            return;
        }

        console.log('Initializing RiversideObserver');
        this._observer = new MutationObserver(this._handleElementChange);
        // listen for SVG class changes
        this._observer.observe(document.body, {
            childList: false,
            attributes: true,
            attributeFilter: ["class"],
            attributeOldValue: true,
            subtree: true,
        });

        this._timer = setInterval(this.updateRiversideStatus, 1000);
    };

    _handleElementChange = (mutationsList) => {
        this.updateRiversideStatus();
    };


    updateRiversideStatus = () => {
        let changed = false;

        // find the mute button
        let buttonMute = document.querySelector('button[data-automation-class*="mic-btn"], button[data-testid*="mic-btn"]');
        if (buttonMute) {
            if (buttonMute.getAttribute('data-automation-class')?.includes('disabled') || buttonMute.getAttribute('data-testid')?.includes('disabled')) {
                if (!this.isMuted) {
                    changed = true;
                }
                this.isMuted = true;
            } else if (buttonMute.getAttribute('data-automation-class')?.includes('enabled') || buttonMute.getAttribute('data-testid')?.includes('enabled')) {
                if (this.isMuted) {
                    changed = true;
                }
                this.isMuted = false;
            }
            this.isInMeeting = true;
        }

        if (this.isInMeeting) {

            // find the camera button and detect its state
            let buttonVideo = document.querySelector('button[data-automation-class*="cam-btn"], button[data-testid*="cam-btn"]');
            if (buttonVideo) {
                if (buttonVideo.getAttribute('data-automation-class')?.includes('disabled') || buttonVideo.getAttribute('data-testid')?.includes('disabled')) {
                    if (this.isVideoStarted) {
                        changed = true;
                    }
                    this.isVideoStarted = false;
                } else if (buttonVideo.getAttribute('data-automation-class')?.includes('enabled') || buttonVideo.getAttribute('data-testid')?.includes('enabled')) {
                    if (!this.isVideoStarted) {
                        changed = true;
                    }
                    this.isVideoStarted = true;
                }
            }

            // find the record button and detect its state
            let buttonRecord = document.querySelector('button[data-automation-class*="record-btn"], button[data-testid*="record-btn"]');
            if (buttonRecord) {
                if (buttonRecord.getAttribute('data-automation-class')?.includes('stopped') || buttonRecord.getAttribute('data-testid')?.includes('stopped')) {
                    if (this.isRecordStarted) {
                        changed = true;
                    }
                    this.isRecordStarted = false;
                } else if (buttonRecord.getAttribute('data-automation-class')?.includes('recording') || buttonRecord.getAttribute('data-testid')?.includes('recording')) {
                    if (!this.isRecordStarted) {
                        changed = true;
                    }
                    this.isRecordStarted = true;
                }
            }

            // find the share button, if <button aria-label="Share"> exists, then we're not sharing. If it doesn't exist, we're sharing.
            let buttonShare = document.querySelector('button[aria-label="Share"]');
            if (buttonShare) {
                if (this.isShareStarted) {
                    changed = true;
                }
                this.isShareStarted = false;
            } else {
                let buttonShareStop = document.querySelector('button[aria-label="Stop"]');
                if (buttonShareStop) {
                    if (!this.isShareStarted) {
                        changed = true;
                    }
                    this.isShareStarted = true;
                }
            }


        } // end if isInMeeting

        // send meeting status if it has been updated, or if it's been 1 second (250ms * 4) since the last update
        if (changed || this._updateLoops >= 3) {
            this.sendRiversideStatus();
            this._updateLoops = 0;
        } else {
            this._updateLoops++;
        }
    }


    /**
     * Actions
     */

    toggleMute = () => {
        let buttonMic = document.querySelector('button[data-automation-class*="mic-btn"], button[data-testid*="mic-btn"]');
        buttonMic.click();
    }

    toggleVideo = () => {
        let buttonVideo = document.querySelector('button[data-automation-class*="cam-btn"], button[data-testid*="cam-btn"]');
        buttonVideo.click();
    }

    toggleShare = async () => {
        if (this.isShareStarted) {
            let buttonShareStop = document.querySelector('button[aria-label="Stop"]');
            buttonShareStop.click();
            console.log('clicking stop');
        }
        else {
            // Find the initial share button
            let buttonShare = document.querySelector('button[aria-label="Share"]');
            if (!buttonShare) {
                console.log('Share button not found');
                return;
            }

            // Simulate a more complete hover interaction
            const mouseEvents = ['mouseover', 'mouseenter', 'mousemove'];
            mouseEvents.forEach(eventType => {
                buttonShare.dispatchEvent(new MouseEvent(eventType, {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    clientX: buttonShare.getBoundingClientRect().left + 5,
                    clientY: buttonShare.getBoundingClientRect().top + 5
                }));
            });

            // Handle the menu interaction after delay
            setTimeout(() => {
                let screenShareButton = document.querySelector('button[data-automation-class*="screen-button"], button[data-testid*="screen-button"]');
                if (screenShareButton) {
                    screenShareButton.click();
                    console.log('clicking screen share option');
                } else {
                    console.log('Screen share option not found after hover');
                }
            }, 1000);
        }
    };

    toggleRecord = () => {
        let buttonRecord = document.querySelector('button[data-automation-class*="record-btn"], button[data-testid*="record-btn"]');
        buttonRecord.click();
    };

    leaveCall = () => {
        // Find the initial share button
        let leaveButton = document.querySelector('button[data-automation-class*="leave-btn"], button[data-testid*="leave-btn"]');
        if (!leaveButton) {
            console.log('Leave button not found');
            return;
        }

        // Simulate a more complete hover interaction
        const mouseEvents = ['mouseover', 'mouseenter', 'mousemove'];
        mouseEvents.forEach(eventType => {
            leaveButton.dispatchEvent(new MouseEvent(eventType, {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: leaveButton.getBoundingClientRect().left + 5,
                clientY: leaveButton.getBoundingClientRect().top + 5
            }));
        });

        // Handle the menu interaction after delay
        setTimeout(() => {
            let leaveStudioButton = document.querySelector('button[data-automation-class*="leave-studio-button"], button[data-testid*="leave-studio-button"]');
            if (leaveStudioButton) {
                leaveStudioButton.click();
                console.log('clicking leave studio button');
            } else {
                console.log('Leave studio button not found after hover');
            }
            // send an enter to trigger a confirmation dialog
            let keyEvent = new KeyboardEvent("keydown", { key: "Enter" });
            document.dispatchEvent(keyEvent);
        }, 1000);
    }


    sendRiversideStatus = () => {
        if (!this.isInMeeting) {
            return;
        }
        const message = {
            'source': 'browser-extension-plugin',
            'action': 'update-status',
            'status': this.isInMeeting ? 'call' : 'closed',
            'mute': this.isMuted ? 'muted' : 'unmuted',
            'video': this.isVideoStarted ? 'started' : 'stopped',
            'share': this.isShareStarted ? 'started' : 'stopped',
            'record': this.isRecordStarted ? 'started' : 'stopped',
            'control': 'riverside',
        };
        console.log(message);
        chrome.runtime.sendMessage({ action: "updateMuteDeckStatus", message: message });
    }
}