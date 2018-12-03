/* global jest */
import Enzyme, { shallow, render, mount } from 'enzyme';
import Adapter from 'enzyme-adapter-react-15.4';
import toJson from 'enzyme-to-json';

// global mocks
import './localStorage.js';