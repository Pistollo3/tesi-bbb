import React from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import PopupVideoList from '/imports/ui/components/popup-video-list/component';
import VideoService from '/imports/ui/components/video-provider/service';

const PopupVideoListContainer = ({ children, ...props }) => {
  const { streams } = props;
  return (!streams.length ? null : <PopupVideoList {...props}>{children}</PopupVideoList>);
};

export default withTracker(props => ({
  streams: props.streams,
  onMount: props.onMount,
  swapLayout: props.swapLayout,
  numberOfPages: VideoService.getNumberOfPages(),
  currentVideoPageIndex: props.currentVideoPageIndex,
}))(PopupVideoListContainer);
