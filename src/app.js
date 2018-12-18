import React from 'react';
import { render } from 'react-dom';
import BaseComponent from 'base-component';
import 'common-scss';
import ReactSoftKey from 'react-soft-key';
import Service from 'service';
import SimpleNavigationHelper from 'simple-navigation-helper';
import Sideview from './components/side_view';
import MainView from './main';
import Loading from './components/loading';
import '../scss/app.scss';
import '../scss/loading.scss';

class App extends BaseComponent {
  name = 'App';

  constructor(props) {
    super(props);

    SimpleNavigationHelper.onBeforeKeyDown = (evt) => {
      if (Service.query('isTransitioning')) {
        evt.preventDefault();
        evt.stopPropagation();
      }
    };
  }

  componentDidMount() {
    window.appInstance = this; // For debugging purpose
  }

  render() {
    return (
      <div id="app" tabIndex="-1" >
        <Loading/>
        <div className="hidden">
          <div className="statusbar-placeholder" />
          <MainView />
        </div>
        <div id="bottom" className="hidden">
          <ReactSoftKey ref="softkey" />
          <Sideview />
        </div>
      </div>
    );
  }
}

render(<App />, document.getElementById('root'));

window.service = Service;
export default App;
