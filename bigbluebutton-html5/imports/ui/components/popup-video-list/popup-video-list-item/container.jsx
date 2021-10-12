import React from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import VoiceUsers from '/imports/api/voice-users/';
import PopupVideoListItem from './component';

const PopupVideoListItemContainer = props => (
  <PopupVideoListItem {...props} />
);

export default withTracker((props) => {
  const {
    userId,
  } = props;

  return {
    voiceUser: VoiceUsers.findOne({ intId: userId }),
  };
})(PopupVideoListItemContainer);
