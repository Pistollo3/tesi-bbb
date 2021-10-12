import { Meteor } from 'meteor/meteor';
import muteToggle from './methods/muteToggle';
import muteAllToggle from './methods/muteAllToggle';
import muteAllExceptPresenterToggle from './methods/muteAllExceptPresenterToggle';
import excludeVoiceToggle from './methods/excludeVoiceToggle';
import ejectUserFromVoice from './methods/ejectUserFromVoice';

Meteor.methods({
  toggleVoice: muteToggle,
  excludeVoiceUser: excludeVoiceToggle,
  muteAllUsers: muteAllToggle,
  muteAllExceptPresenter: muteAllExceptPresenterToggle,
  ejectUserFromVoice,
});
