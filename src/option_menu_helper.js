import BaseModule from 'base-module';
import Service from 'service';
import Utils from './contact_utils';
import SimCardHelper from './sim_card_helper';
import ContactStore from './contact_store';

class OptionMenuHelper extends BaseModule {
  name = 'OptionMenuHelper';
  DEBUG = false;

  constructor(props) {
    super(props);

    Service.register('pickANumber', this);
  }

  optionsForContact(contact) {
    let options = [];

    options.push(
      {
        id: 'edit-contact',
        callback: () => {
          Service.request('push', `/edit/${contact.id}`);
        }
      }
    );
    if (contact && contact.tel && contact.tel.length) {
      let label = 'call';
      if (navigator.mozIccManager.iccIds.length > 1 && !SimCardHelper.isAlwaysAsk()) {
        label = `call-sim-${SimCardHelper.cardIndex + 1}`;
      }
      options.push({
        id: label,
        callback: () => {
          this.pickANumber(contact).then((tel) => {
            Utils.dial(tel);
          });
        }
      }, {
        id: 'send-message',
        callback: () => {
          this.pickANumber(contact).then((tel) => {
            Utils.sendSms(tel);
          });
        }
      });
    }

    if (!Service.query('isLowMemoryDevice')) {
      if (contact && contact.email && contact.email.length && Utils.SUPPORT_EMAIL) {
        options.push({
          id: 'send-email',
          callback: () => {
            this.pickAMail(contact).then((email) => {
              Utils.sendEmail(email);
            });
          }
        });
      }

      options.push(
        {
          id: 'share',
          callback: () => {
            Utils.share(contact);
          }
        }
      );
    }

    return options;
  }

  optionsForContacts() {
    let options = [];
    options.push({
      id: 'massive-delete',
      callback: () => {
        Service.request('setEditMode', 'delete');
      }
    });

    if (navigator.mozIccManager &&
      navigator.mozIccManager.iccIds &&
      navigator.mozIccManager.iccIds.length > 0) {
      options.push({
        id: 'move-contacts',
        callback: () => {
          this.migrateContacts('move');
        }
      });

      options.push({
        id: 'copy-contacts',
        callback: () => {
          this.migrateContacts('copy');
        }
      });
    }

    return options;
  }

  pickANumber(contact) {
    return new Promise((resolve) => {
      if (!contact.tel) {
        resolve(null);
        return;
      }
      if (contact.tel.length > 1) {
        let options = [];
        contact.tel.forEach((tel) => {
          options.push({
            label: `(${tel.type[0].toUpperCase()[0]}) ${tel.value}`,
            callback: () => {
              resolve(tel.value);
            }
          });
        });
        Service.request('showOptionMenu', {
          title: 'choose-number',
          options: options,
          onCancel: () => {
          }
        });
      } else if (contact.tel.length && contact.tel[0].value) {
        resolve(contact.tel[0].value);
      } else {
        resolve(null);
      }
    });
  }

  pickAMail(contact) {
    return new Promise((resolve) => {
      if (contact.email.length > 1) {
        let options = [];
        contact.email.forEach((email) => {
          options.push({
            label: email.value,
            callback: () => {
              resolve(email.value);
            }
          });
        });
        Service.request('showOptionMenu', {
          title: 'choose-mail-adress',
          options: options,
          onCancel: () => {
          }
        });
      } else {
        resolve(contact.email[0].value);
      }
    });
  }

  migrateContacts(mode) {
    this.chooseSource(mode).then((source) => {
      return this.chooseTarget(mode, source);
    }).then((path) => {
      this.debug('migrate from, to:', path[0], path[1]);
      Service.request('popup', path[0]).then((ids) => {
        if (ids && ids[0]) {
          Service.request('popup', path[1], { ids: ids[0] });
        }
      });
    });
  }

  chooseSource(mode) {
    return new Promise((resolve) => {
      let options = [];
      if (ContactStore.getSourceContacts('phone').length) {
        options.push({
          id: 'phone-memory',
          callback: () => resolve('phone')
        });
      }
      Utils.getSIMOptions().forEach(({ id, cardIndex }) => {
        if (ContactStore.getSourceContacts(`sim${cardIndex}`).length) {
          options.push({
            id,
            callback: () => resolve(`sim${cardIndex}`)
          });
        }
      });

      Service.request('showOptionMenu', {
        header: `${mode}-from`,
        options: options
      });
    });
  }

  chooseTarget(mode, source) {
    return new Promise((resolve) => {
      let options = [];
      if ('phone' === source) {
        options = Utils.getSIMOptions().map(({ id, cardIndex }) => ({
          id,
          callback: () => {
            resolve([`/${mode}/from/phone`, `/${mode}/to/sim${cardIndex}`]);
          }
        }));
      } else {
        options = [{
          id: 'phone-memory',
          callback: () => {
            resolve([`/${mode}/from/${source}`, `/${mode}/to/phone`]);
          }
        }];
      }
      Service.request('showOptionMenu', {
        header: 'to',
        options
      });
    });
  }

}

export default (new OptionMenuHelper());
