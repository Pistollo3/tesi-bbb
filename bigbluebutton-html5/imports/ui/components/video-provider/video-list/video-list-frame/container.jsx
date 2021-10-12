import React from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import VoiceUsers from '/imports/api/voice-users/';
import VideoListFrame from './component';

const VideoListFrameContainer = props => (
  <VideoListFrame {...props} />
);

export default withTracker((props) => {
  const {
    userId,
  } = props;

  return {
    voiceUser: VoiceUsers.findOne({ intId: userId }),
  };
})(VideoListFrameContainer);
