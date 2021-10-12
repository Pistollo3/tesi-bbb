import React from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import { injectIntl } from 'react-intl';
import { withModalMounter } from '/imports/ui/components/modal/service';
import VideoFramePreviewContainer from '/imports/ui/components/video-frame-preview/container';
import JoinVideoFrameButton from './component';
import VideoService from '../service';

const JoinVideoFrameOptionsContainer = (props) => {
  const {
    hasVideoStream,
    disableReason,
    intl,
    mountModal,
    ...restProps
  } = props;

  const mountVideoPreview = () => { mountModal(<VideoFramePreviewContainer fromInterface />); };

  return (
    <JoinVideoFrameButton {...{
      mountVideoPreview, hasVideoStream, disableReason, ...restProps,
    }}
    />
  );
};

export default withModalMounter(injectIntl(withTracker(() => ({
  hasVideoStream: VideoService.hasVideoStream(),
  disableReason: VideoService.disableReason(),
}))(JoinVideoFrameOptionsContainer)));
