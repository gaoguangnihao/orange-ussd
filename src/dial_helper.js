/* global window, TelephonyCall, MozActivity */

import BaseModule from 'base-module';
import Service from 'service';

function toL10n(id = '', args = {}) {
  id += '';
  return navigator.mozL10n.get(id, args) || id;
}

// As defined in 3GPP TS 22.030 version 10.0.0 Release 10 standard
// USSD code used to query call barring supplementary service status
const CALL_BARRING_STATUS_MMI_CODE = '*#33#';
// USSD code used to query call waiting supplementary service status
const CALL_WAITING_STATUS_MMI_CODE = '*#43#';

class DialHelper extends BaseModule {
  isDialing = false;
  DEBUG = true;
  name = 'DialHelper';

  constructor(props) {
    super(props);
    this.validExp = /^(?!,)([0-9#+*,]){1,50}$/;
    this.extraCharExp = /(\s|-|\.|\(|\))/g;
    this.instantDialNumbers = [
      '*#06#',
      '*#07#',
      '*#2886#',
      '*#*#0574#*#*'
    ];
    navigator.mozSetMessageHandler('ussd-received', this.onUssdReceived.bind(this));
  }

  onUssdReceived(evt) {
    // evt.session means we need to user's interaction
    if (evt.session) {
      this._session = evt.session;
      let res = window.prompt(evt.message);
      if (res) {
        this.mmiloading = true;
        this.emit('mmiloading');
        this._session.send(res);
      } else {
        // for canceling the mmi-loading dialog
        Service.request('hideDialog');
        this.mmiloading = false;
        this._session.cancel();
        this._session = null;
      }
    } else {
      this.emit('ussd-received', evt);
      this.mmiloading = false;
    }
  }

  errorCases = {
    BadNumber: {
      header: 'invalidNumberToDialTitle',
      content: 'invalidNumberToDialMessage'
    },
    NoNetwork: {
      header: 'emergencyDialogTitle',
      content: 'emergencyDialogBodyBadNumber'
    },
    EmergencyCallOnly: {
      header: 'emergency-call-only',
      content: 'emergency-call-error',
      containNumber: true
    },
    RadioNotAvailable: {
      header: 'callAirplaneModeTitle',
      content: 'callAirplaneModeMessage'
    },
    DeviceNotAcceptedError: {
      header: 'emergencyDialogTitle',
      content: 'emergencyDialogBodyDeviceNotAccepted'
    },
    BusyError: {
      header: 'numberIsBusyTitle',
      content: 'numberIsBusyMessage'
    },
    FDNBlockedError: {
      header: 'fdnIsActiveTitle',
      content: 'fdnIsActiveMessage',
      containNumber: true
    },
    FdnCheckFailure: {
      header: 'fdnIsActiveTitle',
      content: 'fdnIsActiveMessage',
      containNumber: true
    },
    OtherConnectionInUse: {
      header: 'otherConnectionInUseTitle',
      content: 'otherConnectionInUseMessage'
    }
  };

  listDeviceInfos(type) {
    let promises = [...navigator.mozMobileConnections].map((conn, simSlotIndex) => {
      return conn.getDeviceIdentities().then((deviceInfo) => {
        if (deviceInfo[type]) {
          return deviceInfo[type];
        } else {
          let errorMsg = `Could not retrieve the ${type.toUpperCase()} code for SIM ${simSlotIndex}`;
          console.error(errorMsg);
          return Promise.reject(new Error(errorMsg));
        }
      });
    });

    Promise.all(promises).then((items) => {
      this.emit('showDialog', {
        type: 'alert',
        header: type.toUpperCase(),
        content: items.join('\n'),
        translated: true,
        noClose: false
      });
    }, (msg) => {
      this.emit('showDialog', {
        type: 'alert',
        header: type.toUpperCase(),
        content: msg.message,
        translated: true,
        noClose: false
      });
    });
  }

  instantDialIfNecessary(telNum) {
    return this.instantDialNumbers.includes(telNum);
  }

  mmiHandler(promise, sentMMI) {
    this.mmiloading = true;
    this.emit('mmiloading');
    promise.then((mmiResult) => {
      if (!mmiResult) {
        this.emit('mmiloaded', '!', 'GenericFailure');
        return;
      }

      let title = toL10n(mmiResult.serviceCode);
      let message = mmiResult.statusMessage;
      let additionalInformation = mmiResult.additionalInformation;

      switch (mmiResult.serviceCode) {
        case 'scCall':
          return;
        case 'scUssd':
          if (!message) {
            return;
          }
          break;
        case 'scCallForwarding':
          if (!message) {
            message = 'GenericFailure';
          } else if (additionalInformation) {
            // Call forwarding requests via MMI codes might return an array of
            // nsIDOMMozMobileCFInfo objects. In that case we serialize that array
            // into a single string that can be shown on the screen.
            message = this.processCf(additionalInformation);
          }
          break;
        case 'scCallBarring':
        case 'scCallWaiting':
          // If we are just querying the status of the service, we show a different message,
          // so the user knows she hasn't change anything
          if (sentMMI === CALL_BARRING_STATUS_MMI_CODE ||
              sentMMI === CALL_WAITING_STATUS_MMI_CODE) {
            let additionalInfor = [];
            let msgCase = {
              'smServiceEnabled': 'ServiceIsEnabled',
              'smServiceDisabled': 'ServiceIsDisabled',
              'smServiceEnabledFor': 'ServiceIsEnabledFor'
            };
            // Call barring and call waiting requests via MMI codes might return an
            // array of strings indicating the service it is enabled for or just
            // the disabled status message.
            if (additionalInformation &&
                'smServiceEnabledFor' === message &&
                Array.isArray(additionalInformation)) {
              additionalInfor = additionalInformation.map(toL10n);
            }
            additionalInfor.unshift(toL10n(msgCase[message]) || message);
            message = additionalInfor.join('\n');
          }
          break;
        default:
          break;
      }

      this.mmiloading = false;
      this.emit('mmiloaded', title, message);
    });
  }

  // Helper function to compose an informative message about a successful
  // request to query the call forwarding status.
  processCf(result) {
    let inactive = toL10n('call-forwarding-inactive');
    let voice = inactive;
    let data = inactive;
    let fax = inactive;
    let sms = inactive;
    let sync = inactive;
    let async = inactive;
    let packet = inactive;
    let pad = inactive;

    for (let i = 0; i < result.length; i++) {
      if (!result[i].active) {
        continue; // eslint-disable-line no-continue
      }

      for (let serviceClassMask = 1;
           serviceClassMask <= this._conn.ICC_SERVICE_CLASS_MAX;
           serviceClassMask <<= 1) {
        if ((serviceClassMask & result[i].serviceClass) !== 0) {
          switch (serviceClassMask) {
            case this._conn.ICC_SERVICE_CLASS_VOICE:
              voice = result[i].number;
              break;
            case this._conn.ICC_SERVICE_CLASS_DATA:
              data = result[i].number;
              break;
            case this._conn.ICC_SERVICE_CLASS_FAX:
              fax = result[i].number;
              break;
            case this._conn.ICC_SERVICE_CLASS_SMS:
              sms = result[i].number;
              break;
            case this._conn.ICC_SERVICE_CLASS_DATA_SYNC:
              sync = result[i].number;
              break;
            case this._conn.ICC_SERVICE_CLASS_DATA_ASYNC:
              async = result[i].number;
              break;
            case this._conn.ICC_SERVICE_CLASS_PACKET:
              packet = result[i].number;
              break;
            case this._conn.ICC_SERVICE_CLASS_PAD:
              pad = result[i].number;
              break;
            default:
              return toL10n('call-forwarding-error');
          }
        }
      }
    }

    let msg = [
      toL10n('call-forwarding-status'),
      toL10n('call-forwarding-voice', { voice }),
      toL10n('call-forwarding-data', { data }),
      toL10n('call-forwarding-fax', { fax }),
      toL10n('call-forwarding-sms', { sms }),
      toL10n('call-forwarding-sync', { sync }),
      toL10n('call-forwarding-async', { async }),
      toL10n('call-forwarding-packet', { packet }),
      toL10n('call-forwarding-pad', { pad })
    ].join('\n');

    return msg;
  }

  dialForcely(number, serviceId) {
    console.log('dialForcely', number);
    navigator.mozTelephony.dial(number, serviceId);
  }

  dial(number, isVideo) {
    if (this.isDialing) {
      return Promise.reject();
    }

    // sanitization number
    number = String(number).replace(this.extraCharExp, '');

    if (this.checkSpecialNumber(number)) {
      return Promise.resolve();
    }

    if (!this.isValid(number)) {
      this.errorHandler({ errorName: 'BadNumber' });
      return Promise.reject();
    }

    return new Promise((resolve, reject) => {
      Service.request('chooseSim', 'call').then((cardIndex) => {
        let conn = navigator.mozMobileConnections && navigator.mozMobileConnections[cardIndex];
        let self = this;
        let callPromise;
        let originNumber = number;
        number = this.getNumberAsDtmfToneGroups(originNumber)[0];
        this._conn = conn;

        this.debug('start dialer');

        // No voice connection, the call won't make it
        if (!conn || !conn.voice) {
          reject();
          this.errorHandler({ errorName: 'NoNetwork' });
          return;
        }

        let telephony = navigator.mozTelephony;
        if (!telephony) {
          reject();
          return;
        }
        this.isDialing = true;

        let imsCapability = conn.imsHandler && conn.imsHandler.capability;
        let emergencyOnly = !imsCapability && conn.voice.emergencyCallsOnly;
        if (emergencyOnly) {
          callPromise = telephony.dialEmergency(number);
        } else if (isVideo) {
          callPromise = telephony.dialVT(number, 4, cardIndex);
        } else {
          this.debug('dial');
          callPromise = telephony.dial(number, cardIndex);
        }

        callPromise.then((callObj) => {
          if (callObj instanceof TelephonyCall) { // regular call
            telephony.addEventListener('callschanged', function callschangedOnce() {
              self.isDialing = false;
              resolve();
              telephony.removeEventListener('callschanged', callschangedOnce);
            });

            let dtmfToneGroups = this.getNumberAsDtmfToneGroups(originNumber);
            if (dtmfToneGroups.length > 1) {
              callObj.addEventListener('connected', function dtmfToneGroupPlayer() {
                callObj.removeEventListener('connected', dtmfToneGroupPlayer);
                self.playDtmfToneGroups(dtmfToneGroups, cardIndex);
              });
            }
          } else { // MMI call
            self.isDialing = false;
            this.debug('mmiHandler');
            resolve();
            this.mmiHandler(callObj.result, number);
          }
        }).catch((errorName) => {
          self.isDialing = false;
          reject();
          self.errorHandler({
            errorName: errorName,
            number: number,
            isEmergencyOnly: emergencyOnly
          });
        });
      })
      .catch(() => { // for cancel sim card choosing
        reject();
      });
    });
  }

  checkSpecialNumber(number) {
    let isSpecialNumber = true;

    switch (number) {
      case '*#06#': {
        this.listDeviceInfos('imei');
        break;
      }

      case '*#2886#': {
        let activity = new MozActivity({
          name: 'mmitest'
        });
        activity.onerror = () => {
          console.warn('Could not launch mmitest');
        };
        break;
      }

      case '*#*#0574#*#*': {
        let activity = new MozActivity({
          name: 'logmanager'
        });
        activity.onerror = () => {
          console.warn('Could not launch logmanager');
        };
        break;
      }

      default: {
        if (this.debuggerRemoteMode) {
          switch (number) {
            case '*#*#2637643#*#*':
            case '*#8378269#': {
              let activity = new MozActivity({
                name: 'engmode'
              });
              activity.onerror = () => {
                console.warn('Could not launch eng mode');
              };
              break;
            }

            case '*#0606#': {
              this.listDeviceInfos('meid');
              break;
            }

            default: {
              isSpecialNumber = false;
              break;
            }
          }
        } else {
          isSpecialNumber = false;
        }
        break;
      }
    }

    return isSpecialNumber;
  }

  playDtmfToneGroups(dtmfToneGroups, cardIndex) {
    let self = this;

    // Remove the dialed number from the beginning of the array.
    dtmfToneGroups = dtmfToneGroups.slice(1);
    let length = dtmfToneGroups.length;

    // Remove the latest entries
    // from dtmfToneGroups corresponding to ',' characters not to play those pauses.
    let lastCommaIndex = length - 1;
    while ('' === dtmfToneGroups[lastCommaIndex]) {
      lastCommaIndex--;
    }
    dtmfToneGroups = dtmfToneGroups.slice(0, ++lastCommaIndex);
    length = dtmfToneGroups.length;

    let promise = Promise.resolve();
    let counter = 0;
    let pauses;

    // Traverse the dtmfToneGroups array.
    while (counter < length) {
      // Reset the number of pauses before each group of tones.
      pauses = 1;
      while ('' === dtmfToneGroups[counter]) {
        // Add a new pause for each '' in the dtmfToneGroups array.
        pauses++;
        counter++;
      }

      // Send a new group of tones as well as the pauses to play before it.
      promise = promise.then(
        self.playDtmfToneGroup.bind(null, dtmfToneGroups[counter++], pauses, cardIndex)
      );
    }
    return promise;
  }

  playDtmfToneGroup(toneGroup, pauses, cardIndex, pausesDuration = 3000) {
    return navigator.mozTelephony.sendTones(
      toneGroup,
      pausesDuration * pauses, // DTMF_SEPARATOR_PAUSE_DURATION = 3000ms
      null, //  tone duration
      cardIndex
    );
  }

  errorHandler({
    errorName,
    number,
    isEmergencyOnly
  } = {}) {
    console.warn(`Dialer error handler: ${errorName}`);

    if ('BadNumberError' === errorName) {
      // TODO: in emergency app, the errorName should change to use 'EmergencyCallOnly'
      errorName = isEmergencyOnly ? 'NoNetwork' : 'RegularCall';
    }

    let _case = this.errorCases[errorName];

    if (!_case) {
      console.warn(`Unexpected dialer error: ${errorName}`);
      // default error message
      _case = {
        content: 'CallFailed'
      };
    }

    let dialogOption = Object.assign({
      type: 'alert',
      translated: false,
      noClose: false
    }, _case);

    if (dialogOption.containNumber) {
      dialogOption.header = toL10n(dialogOption.header, { number: number });
      dialogOption.content = toL10n(dialogOption.content, { number: number });
      dialogOption.translated = true;
    }

    this.emit('showDialog', dialogOption);
  }

  isValid(number) {
    return this.validExp.test(number);
  }

  getNumberAsDtmfToneGroups(number) {
    return number.split(',');
  }
}

const dialHelper = new DialHelper();
window.dh = dialHelper;

export default dialHelper;
