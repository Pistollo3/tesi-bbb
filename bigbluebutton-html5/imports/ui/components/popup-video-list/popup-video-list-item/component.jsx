import React, { Component } from 'react';
import browser from 'browser-detect';
import { Meteor } from 'meteor/meteor';
import PropTypes from 'prop-types';
import _ from 'lodash';
import cx from 'classnames';
import Dropdown from '/imports/ui/components/dropdown/component';
import DropdownTrigger from '/imports/ui/components/dropdown/trigger/component';
import DropdownContent from '/imports/ui/components/dropdown/content/component';
import DropdownList from '/imports/ui/components/dropdown/list/component';
import DropdownListTitle from '/imports/ui/components/dropdown/list/title/component';
import DropdownListSeparator from '/imports/ui/components/dropdown/list/separator/component';
import DropdownListItem from '/imports/ui/components/dropdown/list/item/component';
import Icon from '/imports/ui/components/icon/component';
import logger from '/imports/startup/client/logger';
import FullscreenService from '/imports/ui/components/fullscreen-button/service';
import FullscreenButtonContainer from '/imports/ui/components/fullscreen-button/container';
import PopupButtonContainer from '/imports/ui/components/popup-button/container';
import { styles } from '../styles.scss';
import { withDraggableConsumer } from '/imports/ui/components/media/webcam-draggable-overlay/context';
import VideoService from '../../video-provider/service';
/*eslint-disable*/

const ALLOW_FULLSCREEN = Meteor.settings.public.app.allowFullscreen;

class PopupVideoListItem extends Component {
  constructor(props) {
    super(props);
    this.videoTag = null;

    this.state = {
      videoIsReady: false,
      isFullscreen: false,
      isReduced: false,
    };

    this.openPopupWindow = this.openPopupWindow.bind(this)
    this.showVideo = this.showVideo.bind(this)

    this.mirrorOwnWebcam = VideoService.mirrorOwnWebcam(props.userId);

    this.setVideoIsReady = this.setVideoIsReady.bind(this);
    this.onFullscreenChange = this.onFullscreenChange.bind(this);
  }

  openPopupWindow(){
    const { cameraId } = this.props
    const addStreamToPopupWindow = new CustomEvent('addStreamToPopupWindow', { detail: { mediaElement: cameraId } });
    window.dispatchEvent(addStreamToPopupWindow);
  }

  showVideo(){
    this.setState({
      isReduced: false
    })
  }

  componentDidMount() {
     const { onMount } = this.props;

    onMount(this.videoTag);

    this.videoTag.addEventListener('loadeddata', this.setVideoIsReady);
    this.videoContainer.addEventListener('fullscreenchange', this.onFullscreenChange);
    this.videoContainer.addEventListener('notReduced', this.showVideo)
  }

  componentDidUpdate() {
  }

  componentWillUnmount() {
    this.videoTag.removeEventListener('loadeddata', this.setVideoIsReady);
    this.videoContainer.removeEventListener('fullscreenchange', this.onFullscreenChange);
  }

  onFullscreenChange() {
    const { isFullscreen } = this.state;
    const serviceIsFullscreen = FullscreenService.isFullScreen(this.videoContainer);

    if (isFullscreen !== serviceIsFullscreen) {
      this.setState({ isFullscreen: serviceIsFullscreen });
    }
  }

  setVideoIsReady() {
    const { videoIsReady } = this.state;
    if (!videoIsReady) this.setState({ videoIsReady: true });
    window.dispatchEvent(new Event('resize'));
  }

  getAvailableActions() {
    const {
      actions,
      cameraId,
      name,
    } = this.props;

    return _.compact([
      <DropdownListTitle className={styles.hiddenDesktop} key="name">{name}</DropdownListTitle>,
      <DropdownListSeparator className={styles.hiddenDesktop} key="sep" />,
      ...actions.map(action => (<DropdownListItem key={cameraId} {...action} />)),
    ]);
  }

  render() {
    const {
      videoIsReady,
      isFullscreen,
      isReduced,
    } = this.state;
    const {
      name,
      voiceUser,
      isUnique
    } = this.props;
    const availableActions = this.getAvailableActions();
    const enableVideoMenu = Meteor.settings.public.kurento.enableVideoMenu || false;

    const result = browser();
    const isFirefox = (result && result.name) ? result.name.includes('firefox') : false;

    return ( isUnique ?
      <div className={cx({
        [styles.content]: true,
        [styles.talking]: voiceUser.talking,
      })}
      >
        {
          !videoIsReady &&
            <div className={styles.connecting}>
              <span className={styles.loadingText}>{name}</span>
            </div>
        }
        <div
          className={styles.videoContainer}
          ref={(ref) => { this.videoContainer = ref; }}
        >
          <video
            muted
            style={{
              width: `40%`, height: `100%`
            }}
            ref={(ref) => { this.videoTag = ref; }}
            autoPlay
            playsInline
          />
        </div>
        { videoIsReady &&
          <div className={styles.info}>
            {voiceUser.muted && !voiceUser.listenOnly ? <Icon className={styles.muted} iconName="unmute_filled" /> : null}
            {voiceUser.listenOnly ? <Icon className={styles.voice} iconName="listen" /> : null}
          </div>
        }
      </div> :
            <div style={{
              width: `100%`, height: `100%`
            }}
            >
              {
                !videoIsReady &&
                <div className={styles.connecting}>
                  <span className={styles.loadingText}>{name}</span>
                </div>
              }
              <div
                  className={styles.videoContainer}
                  ref={(ref) => { this.videoContainer = ref; }}
              >
                <video
                    muted
                    style={{
                      width: `100%`, height: `100%`
                    }}
                    ref={(ref) => { this.videoTag = ref; }}
                    autoPlay
                    playsInline
                />
              </div>
              { videoIsReady &&
              <div className={styles.info}>
                {voiceUser.muted && !voiceUser.listenOnly ? <Icon className={styles.muted} iconName="unmute_filled" /> : null}
                {voiceUser.listenOnly ? <Icon className={styles.voice} iconName="listen" /> : null}
              </div>
              }
            </div>
    );
  }
}

export default withDraggableConsumer(PopupVideoListItem);

PopupVideoListItem.defaultProps = {
  numOfStreams: 0,
  isUnique: false,
};

PopupVideoListItem.propTypes = {
  actions: PropTypes.arrayOf(PropTypes.object).isRequired,
  cameraId: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  numOfStreams: PropTypes.number,
  isUnique: PropTypes.bool,
};

