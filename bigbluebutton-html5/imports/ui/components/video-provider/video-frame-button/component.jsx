import React, { memo } from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import Button from '/imports/ui/components/button/component';
import VideoService from '../service';
import { defineMessages, injectIntl, intlShape } from 'react-intl';
import { styles } from './styles';
import { validIOSVersion } from '/imports/ui/components/app/service';

const intlMessages = defineMessages({
  joinVideoFrame: {
    id: 'app.video.joinVideoFrame',
    description: 'Join video button label',
  },
  leaveVideoFrame: {
    id: 'app.video.leaveVideoFrame',
    description: 'Leave video button label',
  },
  videoLocked: {
    id: 'app.video.videoLocked',
    description: 'video disabled label',
  },
  videoConnecting: {
    id: 'app.video.connecting',
    description: 'video connecting label',
  },
  dataSaving: {
    id: 'app.video.dataSaving',
    description: 'video data saving label',
  },
  meteorDisconnected: {
    id: 'app.video.clientDisconnected',
    description: 'Meteor disconnected label',
  },
  iOSWarning: {
    id: 'app.iOSWarning.label',
    description: 'message indicating to upgrade ios version',
  },
});

const propTypes = {
  intl: intlShape.isRequired,
  hasVideoStream: PropTypes.bool.isRequired,
  mountVideoPreview: PropTypes.func.isRequired,
};

const JoinVideoFrameButton = ({
  intl,
  hasVideoStream,
  disableReason,
  mountVideoPreview,
}) => {
  const exitVideo = () => hasVideoStream && !VideoService.isMultipleCamerasEnabled();

  // eslint-disable-next-line consistent-return
  const handleOnClick = () => {
    if (!validIOSVersion()) {
      return VideoService.notify(intl.formatMessage(intlMessages.iOSWarning));
    }

    if (exitVideo()) {
      VideoService.exitVideo();
    } else {
      mountVideoPreview();
    }
  };

  let label = exitVideo()
    ? intl.formatMessage(intlMessages.leaveVideoFrame)
    : intl.formatMessage(intlMessages.joinVideoFrame);

  if (disableReason) label = intl.formatMessage(intlMessages[disableReason]);

  return (
    <Button
      label={label}
      className={cx(styles.button, hasVideoStream || styles.btn)}
      onClick={handleOnClick}
      hideLabel
      color={hasVideoStream ? 'primary' : 'default'}
      icon={hasVideoStream ? 'close' : 'circle_tool'}
      ghost={!hasVideoStream}
      size="lg"
      circle
      disabled={!!disableReason}
    />
  );
};

JoinVideoFrameButton.propTypes = propTypes;

export default injectIntl(memo(JoinVideoFrameButton));
