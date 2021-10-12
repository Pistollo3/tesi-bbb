/*eslint-disable*/
import { withDraggableConsumer } from '../media/webcam-draggable-overlay/context';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _, {throttle} from 'lodash';
import { defineMessages, injectIntl } from 'react-intl';
import VideoService from "../video-provider/service";
import Button from '@material-ui/core/Button';
import cx from 'classnames';
import {styles} from './styles'
import PopupVideoListItemContainer from "./popup-video-list-item/container";
import AutoplayOverlay from "../media/autoplay-overlay/component";
import logger from "../../../startup/client/logger";
import playAndRetry from "../../../utils/mediaElementPlayRetry";
import streams from "lodash";

const propTypes = {
  streams: PropTypes.arrayOf(PropTypes.string).isRequired,
  onMount: PropTypes.func.isRequired,
  webcamDraggableDispatch: PropTypes.func.isRequired,
  intl: PropTypes.objectOf(Object).isRequired,
  swapLayout: PropTypes.bool.isRequired,
  numberOfPages: PropTypes.number.isRequired,
  currentVideoPageIndex: PropTypes.number.isRequired,
};

const intlMessages = defineMessages({
  focusLabel: {
    id: 'app.videoDock.webcamFocusLabel',
  },
  focusDesc: {
    id: 'app.videoDock.webcamFocusDesc',
  },
  unfocusLabel: {
    id: 'app.videoDock.webcamUnfocusLabel',
  },
  unfocusDesc: {
    id: 'app.videoDock.webcamUnfocusDesc',
  },
  autoplayBlockedDesc: {
    id: 'app.videoDock.autoplayBlockedDesc',
  },
  autoplayAllowLabel: {
    id: 'app.videoDock.autoplayAllowLabel',
  },
  nextPageLabel: {
    id: 'app.video.pagination.nextPage',
  },
  prevPageLabel: {
    id: 'app.video.pagination.prevPage',
  },
});

const findOptimalGrid = (canvasWidth, canvasHeight, gutter, aspectRatio, numItems, columns = 1) => {
  const rows = Math.ceil(numItems / columns);
  const gutterTotalWidth = (columns - 1) * gutter;
  const gutterTotalHeight = (rows - 1) * gutter;
  const usableWidth = canvasWidth - gutterTotalWidth;
  const usableHeight = canvasHeight - gutterTotalHeight;
  let cellWidth = Math.floor(usableWidth / columns);
  let cellHeight = Math.ceil(cellWidth / aspectRatio);
  if ((cellHeight * rows) > usableHeight) {
    cellHeight = Math.floor(usableHeight / rows);
    cellWidth = Math.ceil(cellHeight * aspectRatio);
  }
  const columnNumber = 3;

  return {
    columnNumber,
    rows,
    width: (cellWidth * columns) + gutterTotalWidth,
    height: (cellHeight * rows) + gutterTotalHeight,
    filledArea: (cellWidth * cellHeight) * numItems,
  };
};

const ASPECT_RATIO = 4 / 3;

class PopupVideoList extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      focusedId: false,
      optimalGrid: {
        cols: 1,
        rows: 1,
        filledArea: 0,
      },
      autoplayBlocked: false,
      shownStreams: this.props.streams,
      removedStreams: [],
      layoutStyle: 0,
      currentVideoIndex: 0,
    };

    this.ticking = false;
    this.grid = null;
    this.canvas = null;
    this.failedMediaElements = [];
    this.handleCanvasResize = _.throttle(this.handleCanvasResize.bind(this), 66,
        {
          leading: true,
          trailing: true,
        });
    this.setOptimalGrid = this.setOptimalGrid.bind(this);
    this.handleAllowAutoplay = this.handleAllowAutoplay.bind(this);
    this.handlePlayElementFailed = this.handlePlayElementFailed.bind(this);
    this.autoplayWasHandled = false;

    this.addPopupVideo = this.addPopupVideo.bind(this);
    this.removePopupVideo = this.removePopupVideo.bind(this);
  }

  componentDidMount() {
    // const { webcamDraggableDispatch } = this.props;
    // webcamDraggableDispatch(
    //     {
    //       type: 'setVideoListRef',
    //       value: this.grid,
    //     },
    // );

    this.handleCanvasResize();
    window.addEventListener('resize', this.handleCanvasResize, false);
    window.addEventListener('videoPlayFailed', this.handlePlayElementFailed);
    window.addEventListener('addPopupVideo', this.addPopupVideo);
    window.addEventListener('removePopupVideo', this.removePopupVideo);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleCanvasResize, false);
    window.removeEventListener('videoPlayFailed', this.handlePlayElementFailed);
    window.removeEventListener('addPopupVideo', this.addPopupVideo);
    window.removeEventListener('removePopupVideo', this.removePopupVideo);
  }

  componentWillUpdate(nextProps) {
    const {streams} = this.props
    console.log(streams.length.toString())
  }

  addPopupVideo(e){
    const { mediaElement } = e.detail;
    const { shownStreams } = this.state;

    var currentStreams = shownStreams;
    currentStreams.push(mediaElement.toString())

    this.setState({ shownStreams: currentStreams })
  }

  removePopupVideo(e){
    const { mediaElement } = e.detail;
    const { shownStreams } = this.state;

    var currentStreams = shownStreams;
    currentStreams.forEach(s => {
      if(s.toString().startsWith(mediaElement.toString())){
        let index = currentStreams.indexOf(s)
        currentStreams.splice(index,1)
      }
    })
    this.setState({ shownStreams: currentStreams })
  }

  handleCanvasResize() {
    if (!this.ticking) {
      window.requestAnimationFrame(() => {
        this.ticking = false;
        this.setOptimalGrid();
      });
    }
    this.ticking = true;
  }

  render() {
    const canvasClassName = cx({
      [styles.videoCanvas]: true,
    });
    const videoListClassName = cx({
      [styles.videoList]: true,
    });
    const { intl, streams } = this.props;
    const { optimalGrid, autoplayBlocked, shownStreams, layoutStyle } = this.state;

    let gridColumns = 0;
    if(shownStreams.length === 1) {
      gridColumns = 1
    } else if(shownStreams.length === 2){
      gridColumns = 2;
    } else{
      gridColumns = 3;
    }

    return(
        <div
            style={{position:`relative`, width:`${screen.availWidth}px`,
              height:`${screen.availHeight}px`, backgroundImage: 'linear-gradient(-180deg, #06001e 0%, #000032 100%)'}}>
          {!streams.length ? null : (
              <div
                  style={{
                    display: `grid`,
                    width: `${optimalGrid.width}px`,
                    height: `${optimalGrid.height}px`,
                    gridTemplateColumns: layoutStyle === 0 ? `repeat(${gridColumns}, 320px)` : `1fr`,
                    gridTemplateRows: layoutStyle === 0 ? `repeat(${gridColumns}, 260px)` : `1fr`,
                  }}
              >
                { layoutStyle === 0 ? this.renderVideoList() : this.renderSingleVideo() }
              </div>
          )}
          { !autoplayBlocked ? null : (
              <AutoplayOverlay
                  autoplayBlockedDesc={intl.formatMessage(intlMessages.autoplayBlockedDesc)}
                  autoplayAllowLabel={intl.formatMessage(intlMessages.autoplayAllowLabel)}
                  handleAllowAutoplay={this.handleAllowAutoplay}
              />
          )}

          { this.renderChangeLayoutButton() }

        </div>
    );
    // return (
    //     <div>
    //       {this.renderPreviousPageButton()}
    //     </div>
    // );

  }

  renderChangeLayoutButton(){
    return (
        <Button
            variant="outlined"
            style={{position:`absolute`, width: `100px`, bottom:`60px`, left: `${screen.availWidth/2 - 50}`}}
            onClick={() => {
              const { layoutStyle } = this.state;
              if(layoutStyle === 0){
                this.setState({layoutStyle: 1})
              } else {
                this.setState({layoutStyle: 0})
              }
            }}>Change layout</Button>
    )
  }

  setOptimalGrid() {
    const { streams } = this.props;
    let numItems = streams.length;
    if (numItems < 1 || !this.canvas || !this.grid) {
      return;
    }
    const { focusedId } = this.state;
    const { width: canvasWidth, height: canvasHeight } = this.canvas.getBoundingClientRect();

    const gridGutter = parseInt(window.getComputedStyle(this.grid)
        .getPropertyValue('grid-row-gap'), 10);
    const hasFocusedItem = numItems > 2 && focusedId;
    // Has a focused item so we need +3 cells
    if (hasFocusedItem) {
      numItems += 3;
    }
    const optimalGrid = _.range(1, numItems + 1)
        .reduce((currentGrid, col) => {
          const testGrid = findOptimalGrid(
              canvasWidth, canvasHeight, gridGutter,
              ASPECT_RATIO, numItems, 3,
          );
          // We need a minimun of 2 rows and columns for the focused
          const focusedConstraint = hasFocusedItem ? testGrid.rows > 1 && testGrid.columns > 1 : true;
          const betterThanCurrent = testGrid.filledArea > currentGrid.filledArea;
          return testGrid
          //return focusedConstraint && betterThanCurrent ? testGrid : currentGrid;
        }, { filledArea: 0 });
    this.setState({
      optimalGrid,
    });
  }

  handlePlayElementFailed(e) {
    const { mediaElement } = e.detail;
    const { autoplayBlocked } = this.state;

    e.stopPropagation();
    this.failedMediaElements.push(mediaElement);
    if (!autoplayBlocked && !this.autoplayWasHandled) {
      logger.info({
        logCode: 'video_provider_autoplay_prompt',
      }, 'Prompting user for action to play video media');
      this.setState({ autoplayBlocked: true });
    }
  }

  handleAllowAutoplay() {
    const { autoplayBlocked } = this.state;

    logger.info({
      logCode: 'video_provider_autoplay_allowed',
    }, 'Video media autoplay allowed by the user');

    this.autoplayWasHandled = true;
    window.removeEventListener('videoPlayFailed', this.handlePlayElementFailed);
    while (this.failedMediaElements.length) {
      const mediaElement = this.failedMediaElements.shift();
      if (mediaElement) {
        const played = playAndRetry(mediaElement);
        if (!played) {
          logger.error({
            logCode: 'video_provider_autoplay_handling_failed',
          }, 'Video autoplay handling failed to play media');
        } else {
          logger.info({
            logCode: 'video_provider_media_play_success',
          }, 'Video media played successfully');
        }
      }
    }
    if (autoplayBlocked) { this.setState({ autoplayBlocked: false }); }
  }

  handleVideoFocus(id) {
    const { focusedId } = this.state;
    this.setState({
      focusedId: focusedId !== id ? id : false,
    }, this.handleCanvasResize);
    window.dispatchEvent(new Event('videoFocusChange'));
  }

  renderSingleVideo(){
    const {
      onMount,
      swapLayout,
    } = this.props;
    const { removedStreams, shownStreams, currentVideoIndex } = this.state;

    let streamsOk = shownStreams.filter(s=> {
      let shouldBeSeen = true
      removedStreams.forEach(ss=>{
        if(s.toString() === ss.toString()){
          shouldBeSeen = false
        }
      })
      return shouldBeSeen
    })

    let shownStream = streamsOk[currentVideoIndex]

    const { streams, totalNumberOfStreams } = VideoService.getVideoStreams()

    let selectedStream = streams.filter((s) => {
      return s.cameraId.toString().startsWith(shownStream.toString())
    })[0]
    const { cameraId, userId, name } = selectedStream;

    let actions = [];

    return (
        <div style={{width: `100%`, textAlign: `center`}}>
          <PopupVideoListItemContainer
              style={{display: `inline-block`}}
              numOfStreams={1}
              cameraId={cameraId}
              userId={userId}
              name={name}
              actions={actions}
              isUnique={true}
              onMount={(videoRef) => {
                this.handleCanvasResize();
                onMount(cameraId, videoRef);
              }}
              swapLayout={swapLayout}
          />
          <Button
              style={{display: `inline-block`}}
              onClick={()=>{
                this.goToNextUser()
              }
          }>Next user</Button>
        </div>
    )
  }

  goToNextUser(){
    const { currentVideoIndex, shownStreams, removedStreams } = this.state;

    var index = currentVideoIndex;
    let streamsOk = shownStreams.filter(s=> {
      let shouldBeSeen = true
      removedStreams.forEach(ss=>{
        if(s.toString() === ss.toString()){
          shouldBeSeen = false
        }
      })
      return shouldBeSeen
    })


    if(index === streamsOk.length-1){
      index = 0;
    } else {
      index++;
    }

    this.setState({ currentVideoIndex: index })

  }

  renderVideoList() {
    const {
      intl,
      onMount,
      swapLayout,
    } = this.props;

    const { focusedId, removedStreams, shownStreams } = this.state;

    const numOfStreams = shownStreams.length;

    return shownStreams.filter(s=> {
      let shouldBeSeen = true
      removedStreams.forEach(ss=>{
        if(s.toString() === ss.toString()){
          shouldBeSeen = false
        }
      })
      return shouldBeSeen
    }).map((stream) => {
      const { streams, totalNumberOfStreams } = VideoService.getVideoStreams()

      let selectedStream = streams.filter((s) => {
        return s.cameraId.toString().startsWith(stream.toString())
      })[0]

      const { cameraId, userId, name } = selectedStream;
      const isFocused = focusedId === cameraId;
      const isFocusedIntlKey = !isFocused ? 'focus' : 'unfocus';
      let actions = [];

      if (numOfStreams > 2) {
        actions = [{
          label: intl.formatMessage(intlMessages[`${isFocusedIntlKey}Label`]),
          description: intl.formatMessage(intlMessages[`${isFocusedIntlKey}Desc`]),
          onClick: () => this.handleVideoFocus(cameraId),
        }];
      }

      return (
          <div
              key={cameraId}
              style={{display: `grid-item`, backgroundColor: `black`}}
          >
            <PopupVideoListItemContainer
                numOfStreams={numOfStreams}
                cameraId={cameraId}
                userId={userId}
                name={name}
                actions={actions}
                onMount={(videoRef) => {
                  this.handleCanvasResize();
                  onMount(cameraId, videoRef);
                }}
                swapLayout={swapLayout}
            />
          </div>
      );
    });
  }
}
PopupVideoList.propTypes = propTypes;

export default injectIntl(withDraggableConsumer(PopupVideoList));
