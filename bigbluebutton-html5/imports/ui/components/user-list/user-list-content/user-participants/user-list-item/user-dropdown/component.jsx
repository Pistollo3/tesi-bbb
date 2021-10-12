import React, { PureComponent } from 'react';
import { defineMessages } from 'react-intl';
import PropTypes from 'prop-types';
import { findDOMNode } from 'react-dom';
import UserAvatar from '/imports/ui/components/user-avatar/component';
import Icon from '/imports/ui/components/icon/component';
import Dropdown from '/imports/ui/components/dropdown/component';
import DropdownTrigger from '/imports/ui/components/dropdown/trigger/component';
import DropdownContent from '/imports/ui/components/dropdown/content/component';
import DropdownList from '/imports/ui/components/dropdown/list/component';
import DropdownListItem from '/imports/ui/components/dropdown/list/item/component';
import DropdownListSeparator from '/imports/ui/components/dropdown/list/separator/component';
import lockContextContainer from '/imports/ui/components/lock-viewers/context/container';
import { withModalMounter } from '/imports/ui/components/modal/service';
import RemoveUserModal from '/imports/ui/components/modal/remove-user/component';
import _, {throttle} from 'lodash';
import { Session } from 'meteor/session';
import { styles } from './styles';
import UserName from '../user-name/component';
import UserIcons from '../user-icons/component';
import UserListService from '/imports/ui/components/user-list/service';
import logger from "../../../../../../../startup/client/logger";
/*eslint-disable*/

const messages = defineMessages({
  presenter: {
    id: 'app.userList.presenter',
    description: 'Text for identifying presenter user',
  },
  you: {
    id: 'app.userList.you',
    description: 'Text for identifying your user',
  },
  locked: {
    id: 'app.userList.locked',
    description: 'Text for identifying locked user',
  },
  guest: {
    id: 'app.userList.guest',
    description: 'Text for identifying guest user',
  },
  menuTitleContext: {
    id: 'app.userList.menuTitleContext',
    description: 'adds context to userListItem menu title',
  },
  userAriaLabel: {
    id: 'app.userList.userAriaLabel',
    description: 'aria label for each user in the userlist',
  },
  statusTriggerLabel: {
    id: 'app.actionsBar.emojiMenu.statusTriggerLabel',
    description: 'label for option to show emoji menu',
  },
  backTriggerLabel: {
    id: 'app.audio.backLabel',
    description: 'label for option to hide emoji menu',
  },
  ChatLabel: {
    id: 'app.userList.menu.chat.label',
    description: 'Save the changes and close the settings menu',
  },
  ClearStatusLabel: {
    id: 'app.userList.menu.clearStatus.label',
    description: 'Clear the emoji status of this user',
  },
  takePresenterLabel: {
    id: 'app.actionsBar.actionsDropdown.takePresenter',
    description: 'Set this user to be the presenter in this meeting',
  },
  makePresenterLabel: {
    id: 'app.userList.menu.makePresenter.label',
    description: 'label to make another user presenter',
  },
  RemoveUserLabel: {
    id: 'app.userList.menu.removeUser.label',
    description: 'Forcefully remove this user from the meeting',
  },
  MuteUserAudioLabel: {
    id: 'app.userList.menu.muteUserAudio.label',
    description: 'Forcefully mute this user',
  },
  UnmuteUserAudioLabel: {
    id: 'app.userList.menu.unmuteUserAudio.label',
    description: 'Forcefully unmute this user',
  },
  PromoteUserLabel: {
    id: 'app.userList.menu.promoteUser.label',
    description: 'Forcefully promote this viewer to a moderator',
  },
  DemoteUserLabel: {
    id: 'app.userList.menu.demoteUser.label',
    description: 'Forcefully demote this moderator to a viewer',
  },
  UnlockUserLabel: {
    id: 'app.userList.menu.unlockUser.label',
    description: 'Unlock individual user',
  },
  LockUserLabel: {
    id: 'app.userList.menu.lockUser.label',
    description: 'Lock a unlocked user',
  },
  DirectoryLookupLabel: {
    id: 'app.userList.menu.directoryLookup.label',
    description: 'Directory lookup',
  },
  yesLabel: {
    id: 'app.endMeeting.yesLabel',
    description: 'confirm button label',
  },
  noLabel: {
    id: 'app.endMeeting.noLabel',
    description: 'cancel confirm button label',
  },
  removeConfirmTitle: {
    id: 'app.userList.menu.removeConfirmation.label',
    description: 'title for remove user confirmation modal',
  },
  removeConfirmDesc: {
    id: 'app.userlist.menu.removeConfirmation.desc',
    description: 'description for remove user confirmation',
  },
});

const propTypes = {
  compact: PropTypes.bool.isRequired,
  user: PropTypes.shape({}).isRequired,
  intl: PropTypes.shape({
    formatMessage: PropTypes.func.isRequired,
  }).isRequired,
  normalizeEmojiName: PropTypes.func.isRequired,
  isThisMeetingLocked: PropTypes.bool.isRequired,
  getScrollContainerRef: PropTypes.func.isRequired,
  toggleUserLock: PropTypes.func.isRequired,
};
const CHAT_ENABLED = Meteor.settings.public.chat.enabled;
const ROLE_MODERATOR = Meteor.settings.public.user.role_moderator;

class UserDropdown extends PureComponent {
  /**
   * Return true if the content fit on the screen, false otherwise.
   *
   * @param {number} contentOffSetTop
   * @param {number} contentOffsetHeight
   * @return True if the content fit on the screen, false otherwise.
   */
  static checkIfDropdownIsVisible(contentOffSetTop, contentOffsetHeight) {
    return (contentOffSetTop + contentOffsetHeight) < window.innerHeight;
  }

  constructor(props) {
    super(props);

    this.state = {
      isActionsOpen: false,
      dropdownOffset: 0,
      dropdownDirection: 'top',
      dropdownVisible: false,
      showNestedOptions: false,
      shownStreams: [],
      removedStreams: [],
      audioOn: [],
      audioOff: [],
    };

    this.handleScroll = this.handleScroll.bind(this);
    this.onActionsShow = this.onActionsShow.bind(this);
    this.onActionsHide = this.onActionsHide.bind(this);
    this.getDropdownMenuParent = this.getDropdownMenuParent.bind(this);
    this.renderUserAvatar = this.renderUserAvatar.bind(this);
    this.resetMenuState = this.resetMenuState.bind(this);
    this.makeDropdownItem = this.makeDropdownItem.bind(this);

    this.handleStreamRemoved = throttle(this.handleStreamRemoved).bind(this);
    this.handleStreamShown = throttle(this.handleStreamShown).bind(this);

    this.handleAudioOff = throttle(this.handleAudioOff).bind(this);
    this.handleAudioOn = throttle(this.handleAudioOn).bind(this);
    this.handleAudio = throttle(this.handleAudio).bind(this);
  }

  componentWillMount() {
    this.title = _.uniqueId('dropdown-title-');
    this.seperator = _.uniqueId('action-separator-');
  }

  componentDidMount() {
    window.addEventListener('streamRemoved', this.handleStreamRemoved);
    window.addEventListener('streamShown', this.handleStreamShown);
  }

  componentDidUpdate() {
    this.checkDropdownDirection();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleStreamRemoved, false);
    window.removeEventListener('resize', this.handleStreamShown, false);
  }

  handleStream(){
    const { removedStreams, shownStreams } = this.state;
    const { user } = this.props;

    let finalStream = user.userId

    let rStreams = removedStreams
    let sStreams = shownStreams
    let foundInRemoved = false

    rStreams.forEach(s => {
      if(s.toString().startsWith(user.userId.toString())){
        let index = rStreams.indexOf(s)
        rStreams.splice(index,1)

        sStreams.push(s)

        foundInRemoved= true
      }
    })

    if(!foundInRemoved){
      let foundInShown = false
      sStreams.forEach(s => {
        if(s.toString().startsWith(user.userId.toString())){
          foundInShown = true
          let index = sStreams.indexOf(s)
          sStreams.splice(index,1)

          finalStream = s

          rStreams.push(s)
        }
      })
      // if(!foundInShown){
      //   rStreams.push(user.userId)
      // }
    }

    this.setState({
      removedStreams: rStreams,
      shownStreams: sStreams
    }, () =>{
      if(foundInRemoved){
        const restartStreamEvent = new CustomEvent('restartStream', { detail: { mediaElement: finalStream } });
        window.dispatchEvent(restartStreamEvent);
      } else {
        const blockStreamEvent = new CustomEvent('blockStream', { detail: { mediaElement: finalStream } });
        window.dispatchEvent(blockStreamEvent);
      }
    })
  }

  handleStreamRemoved(e) {
    const { mediaElement } = e.detail;
    const { removedStreams, shownStreams } = this.state

    e.stopPropagation();

    let sStreams = shownStreams
    let index = shownStreams.indexOf(mediaElement);
    if (index > -1) {
      sStreams.splice(index, 1);
    }

    let rStreams = removedStreams
    let index2 = removedStreams.indexOf(mediaElement)
    if (index2 > -1) {
      rStreams.splice(index2, 1);
    }

    this.setState({
      removedStreams: rStreams,
      shownStreams: sStreams
    })
  }

  handleStreamShown(e){
    const { mediaElement } = e.detail;
    const { removedStreams, shownStreams } = this.state

    e.stopPropagation();

    let sStreams = shownStreams
    sStreams.push(mediaElement)

    let rStreams = removedStreams
    let index = rStreams.indexOf(mediaElement)
    if (index > -1) {
      rStreams.splice(index, 1);
    }

    this.setState({
      removedStreams: rStreams,
      shownStreams: sStreams
    })
  }

  handleAudio(e){
    const { userId } = e.detail;
    const { audioOff, audioOn } = this.state

    e.stopPropagation();

    const blockAudioEvent = new CustomEvent('audioOff', { detail: { mediaElement: userId } });
    window.dispatchEvent(blockAudioEvent);

    // let finalAudio = mediaElement
    //
    // let rAudios = audioOff
    // let sAudios = audioOn
    // let foundInRemoved = false
    //
    // rAudios.forEach(s => {
    //   logger.info('MEDIAELEMENT: '+mediaElement.toString())
    //   logger.info('STREAM: '+s.toString())
    //   if(s.toString().startsWith(mediaElement.toString())){
    //     logger.info('FOUND')
    //     let index = rAudios.indexOf(s)
    //     rAudios.splice(index,1)
    //
    //     if(!sAudios.includes(s)) {
    //       sAudios.push(s)
    //     }
    //
    //     foundInRemoved= true
    //   }
    // })
    //
    // if(!foundInRemoved){
    //   let foundInShown = false
    //   sAudios.forEach(s => {
    //     if(s.toString().startsWith(mediaElement.toString())){
    //       foundInShown = true
    //       let index = sAudios.indexOf(s)
    //       sAudios.splice(index,1)
    //
    //       finalAudio = s
    //
    //       if(!rAudios.includes(s)) {
    //         rAudios.push(s)
    //       }
    //     }
    //   })
    //   if(!foundInShown){
    //     if(!rAudios.includes(mediaElement)) {
    //       rAudios.push(mediaElement)
    //     }
    //   }
    // }
    //
    // logger.info('AUDIO OFF')
    // rAudios.forEach(r => logger.info(r.toString()))
    // logger.info('AUDIO ON')
    // sAudios.forEach(r => logger.info(r.toString()))
    // logger.info('END')
    //
    // this.setState({
    //   audioOff: rAudios,
    //   audioOn: sAudios
    // }, () =>{
    //   if(foundInRemoved){
    //     const restartAudioEvent = new CustomEvent('audioOn', { detail: { mediaElement: finalAudio } });
    //     window.dispatchEvent(restartAudioEvent);
    //   } else {
    //     const blockAudioEvent = new CustomEvent('audioOff', { detail: { mediaElement: finalAudio } });
    //     window.dispatchEvent(blockAudioEvent);
    //   }
    // })



  }

  handleAudioOff(e) {
    const { mediaElement } = e.detail;
    const { audioOff, audioOn } = this.state

    e.stopPropagation();

    let rAudios = audioOff
    if(!rAudios.includes(mediaElement)) {
      rAudios.push(mediaElement)
    }

    let sAudios = audioOn
    let index = audioOn.indexOf(mediaElement)
    if (index > -1) {
      sAudios.splice(index, 1);
    }

    this.setState({
      audioOff: rAudios,
      audioOn: sAudios
    })
  }

  handleAudioOn(e){
    const { mediaElement } = e.detail;
    const { audioOff, audioOn } = this.state

    e.stopPropagation();

    let sAudios = audioOn
    if(!sAudios.includes(mediaElement)) {
      sAudios.push(mediaElement)
    }

    let rAudios = audioOff
    let index = rAudios.indexOf(mediaElement)
    if (index > -1) {
      rAudios.splice(index, 1);
    }

    this.setState({
      audioOff: rAudios,
      audioOn: sAudios
    })
  }

  onActionsShow() {
    Session.set('dropdownOpen', true);
    const { getScrollContainerRef } = this.props;
    const dropdown = this.getDropdownMenuParent();
    const scrollContainer = getScrollContainerRef();

    if (dropdown && scrollContainer) {
      const dropdownTrigger = dropdown.children[0];
      const list = findDOMNode(this.list);
      const children = [].slice.call(list.children);
      children.find(child => child.getAttribute('role') === 'menuitem').focus();

      this.setState({
        isActionsOpen: true,
        dropdownVisible: false,
        dropdownOffset: dropdownTrigger.offsetTop - scrollContainer.scrollTop,
        dropdownDirection: 'top',
      });

      scrollContainer.addEventListener('scroll', this.handleScroll, false);
    }
  }

  onActionsHide(callback) {
    const { getScrollContainerRef } = this.props;

    this.setState({
      isActionsOpen: false,
      dropdownVisible: false,
      showNestedOptions: false,
    });

    const scrollContainer = getScrollContainerRef();
    scrollContainer.removeEventListener('scroll', this.handleScroll, false);

    if (callback) {
      return callback;
    }

    return Session.set('dropdownOpen', false);
  }

  handleShowAndHideVideo(){
    const { user } = this.props;

    const handleStreamEvent = new CustomEvent('handleStream', { detail: { mediaElement: user.userId } });
    window.dispatchEvent(handleStreamEvent);
  }

  handleMuteAndUnmuteAudio(){
    const { user } = this.props;

    const handleStreamEvent = new CustomEvent('handleAudio', { detail: { mediaElement: user.userId } });
    window.dispatchEvent(handleStreamEvent);
  }

  getUsersActions() {
    const {
      intl,
      currentUser,
      user,
      voiceUser,
      getAvailableActions,
      getGroupChatPrivate,
      getEmojiList,
      setEmojiStatus,
      assignPresenter,
      removeUser,
      toggleVoice,
      changeRole,
      lockSettingsProps,
      hasPrivateChatBetweenUsers,
      toggleUserLock,
      requestUserInformation,
      isMeteorConnected,
      userLocks,
      isMe,
      meetingIsBreakout,
      mountModal,
    } = this.props;
    const { showNestedOptions, removedStreams, shownStreams } = this.state;

    const amIModerator = currentUser.role === ROLE_MODERATOR;
    const actionPermissions = getAvailableActions(amIModerator, meetingIsBreakout, user, voiceUser);
    const actions = [];

    const {
      allowedToChatPrivately,
      allowedToMuteAudio,
      allowedToUnmuteAudio,
      allowedToResetStatus,
      allowedToRemove,
      allowedToSetPresenter,
      allowedToPromote,
      allowedToDemote,
      allowedToChangeStatus,
      allowedToChangeUserLockStatus,
    } = actionPermissions;

    const { disablePrivateChat } = lockSettingsProps;

    const enablePrivateChat = currentUser.role === ROLE_MODERATOR
      ? allowedToChatPrivately
      : allowedToChatPrivately
      && (!(currentUser.locked && disablePrivateChat)
        || hasPrivateChatBetweenUsers(currentUser.userId, user.userId)
        || user.role === ROLE_MODERATOR) && isMeteorConnected;

    const { allowUserLookup } = Meteor.settings.public.app;

    if (showNestedOptions && isMeteorConnected) {
      if (allowedToChangeStatus) {
        actions.push(this.makeDropdownItem(
          'back',
          intl.formatMessage(messages.backTriggerLabel),
          () => this.setState(
            {
              showNestedOptions: false,
              isActionsOpen: true,
            }, Session.set('dropdownOpen', true),
          ),
          'left_arrow',
        ));
      }

      actions.push(<DropdownListSeparator key={_.uniqueId('list-separator-')} />);

      const statuses = Object.keys(getEmojiList);
      statuses.map(status => actions.push(this.makeDropdownItem(
        status,
        intl.formatMessage({ id: `app.actionsBar.emojiMenu.${status}Label` }),
        () => { setEmojiStatus(user.userId, status); this.resetMenuState(); },
        getEmojiList[status],
      )));

      return actions;
    }

    if (allowedToChangeStatus && isMeteorConnected) {
      actions.push(this.makeDropdownItem(
        'setstatus',
        intl.formatMessage(messages.statusTriggerLabel),
        () => this.setState(
          {
            showNestedOptions: true,
            isActionsOpen: true,
          }, Session.set('dropdownOpen', true),
        ),
        'user',
        'right_arrow',
      ));
    }

    let streamIsRemoved = false
    let streamIsShown = false

    removedStreams.forEach(s => {
      if(s.toString().startsWith(user.userId.toString())){
        streamIsRemoved = true
      }
    })

    if(!streamIsRemoved){
      shownStreams.forEach(s => {
        if(s.toString().startsWith(user.userId.toString())){
          streamIsShown = true
        }
      })
    }

    //@TODO mettere pulsante se user sta streammando e NON sei tu
    if(streamIsShown || streamIsRemoved){
      actions.push(this.makeDropdownItem(
          'removeStreamBtn',
          (!streamIsRemoved && !streamIsShown) ? "Remove user stream" : streamIsRemoved ? "Show user stream" : "Remove user stream",
          () => this.handleStream(),
          (!streamIsRemoved && !streamIsShown) ? 'video' : streamIsRemoved ? 'video_off' : 'video',
      ));
    }

    //AUDIO

    // actions.push(this.makeDropdownItem(
    //     'ao',
    //     "Exclude user audio",
    //     () => this.excludeUserAudio(user.userId),
    //     'video',
    // ));


    //AUDIO

    // let audioIsOff = false
    // let audioIsOn = false
    //
    // audioOff.forEach(s => {
    //   if(s.toString().startsWith(user.userId.toString())){
    //     audioIsOff = true
    //   }
    // })
    //
    // if(!audioIsOff){
    //   audioOn.forEach(s => {
    //     if(s.toString().startsWith(user.userId.toString())){
    //       audioIsOn = true
    //     }
    //   })
    // }
    //
    // //@TODO mettere pulsante se user sta streammando e NON sei tu
    // if(audioIsOn || audioIsOff){
    //   actions.push(this.makeDropdownItem(
    //       'ao',
    //       (!audioIsOff && !audioIsOn) ? "Mute user" : audioIsOff ? "Unmute user" : "Mute user",
    //       () => this.handleMuteAndUnmuteAudio(),
    //       'user',
    //   ));
    // }




    const showChatOption = CHAT_ENABLED
      && enablePrivateChat
      && user.clientType !== 'dial-in-user'
      && !meetingIsBreakout
      && isMeteorConnected;

    if (showChatOption) {
      actions.push(this.makeDropdownItem(
        'activeChat',
        intl.formatMessage(messages.ChatLabel),
        () => {
          getGroupChatPrivate(currentUser.userId, user);
          Session.set('openPanel', 'chat');
          Session.set('idChatOpen', user.userId);
        },
        'chat',
      ));
    }

    if (allowedToResetStatus && user.emoji !== 'none' && isMeteorConnected) {
      actions.push(this.makeDropdownItem(
        'clearStatus',
        intl.formatMessage(messages.ClearStatusLabel),
        () => this.onActionsHide(setEmojiStatus(user.userId, 'none')),
        'clear_status',
      ));
    }

    if (allowedToMuteAudio && isMeteorConnected && !meetingIsBreakout) {
      actions.push(this.makeDropdownItem(
        'mute',
        intl.formatMessage(messages.MuteUserAudioLabel),
        () => this.onActionsHide(toggleVoice(user.userId)),
        'mute',
      ));
    }

    if (allowedToUnmuteAudio && !userLocks.userMic && isMeteorConnected && !meetingIsBreakout) {
      actions.push(this.makeDropdownItem(
        'unmute',
        intl.formatMessage(messages.UnmuteUserAudioLabel),
        () => this.onActionsHide(toggleVoice(user.userId)),
        'unmute',
      ));
    }

    if (allowedToSetPresenter && isMeteorConnected) {
      actions.push(this.makeDropdownItem(
        'setPresenter',
        isMe(user.userId)
          ? intl.formatMessage(messages.takePresenterLabel)
          : intl.formatMessage(messages.makePresenterLabel),
        () => this.onActionsHide(assignPresenter(user.userId)),
        'presentation',
      ));
    }

    if (allowedToPromote && !user.guest && isMeteorConnected) {
      actions.push(this.makeDropdownItem(
        'promote',
        intl.formatMessage(messages.PromoteUserLabel),
        () => this.onActionsHide(changeRole(user.userId, 'MODERATOR')),
        'promote',
      ));
    }

    if (allowedToDemote && !user.guest && isMeteorConnected) {
      actions.push(this.makeDropdownItem(
        'demote',
        intl.formatMessage(messages.DemoteUserLabel),
        () => this.onActionsHide(changeRole(user.userId, 'VIEWER')),
        'user',
      ));
    }

    if (allowedToChangeUserLockStatus && isMeteorConnected) {
      const userLocked = user.locked && user.role !== ROLE_MODERATOR;
      actions.push(this.makeDropdownItem(
        'unlockUser',
        userLocked ? intl.formatMessage(messages.UnlockUserLabel, { 0: user.name })
          : intl.formatMessage(messages.LockUserLabel, { 0: user.name }),
        () => this.onActionsHide(toggleUserLock(user.userId, !userLocked)),
        userLocked ? 'unlock' : 'lock',
      ));
    }

    if (allowUserLookup && isMeteorConnected) {
      actions.push(this.makeDropdownItem(
        'directoryLookup',
        intl.formatMessage(messages.DirectoryLookupLabel),
        () => this.onActionsHide(requestUserInformation(user.extId)),
        'user',
      ));
    }

    if (allowedToRemove && isMeteorConnected) {
      actions.push(this.makeDropdownItem(
        'remove',
        intl.formatMessage(messages.RemoveUserLabel, { 0: user.name }),
        () => this.onActionsHide(mountModal(
          <RemoveUserModal
            intl={intl}
            user={user}
            onConfirm={removeUser}
          />,
        )),
        'circle_close',
      ));
    }

    return actions;
  }

  excludeUserAudio(userId) {
    UserListService.excludeUserVoice(userId)
  }

  getDropdownMenuParent() {
    return findDOMNode(this.dropdown);
  }

  makeDropdownItem(key, label, onClick, icon = null, iconRight = null) {
    const { getEmoji } = this.props;
    return (
      <DropdownListItem
        {...{
          key,
          label,
          onClick,
          icon,
          iconRight,
        }}
        className={key === getEmoji ? styles.emojiSelected : null}
        data-test={key}
      />
    );
  }

  resetMenuState() {
    return this.setState({
      isActionsOpen: false,
      dropdownOffset: 0,
      dropdownDirection: 'top',
      dropdownVisible: false,
      showNestedOptions: false,
    });
  }


  handleScroll() {
    this.setState({
      isActionsOpen: false,
      showNestedOptions: false,
    });
  }

  /**
   * Check if the dropdown is visible, if so, check if should be draw on top or bottom direction.
   */
  checkDropdownDirection() {
    const { getScrollContainerRef } = this.props;
    if (this.isDropdownActivedByUser()) {
      const dropdown = this.getDropdownMenuParent();
      const dropdownTrigger = dropdown.children[0];
      const dropdownContent = dropdown.children[1];

      const scrollContainer = getScrollContainerRef();

      const nextState = {
        dropdownVisible: true,
      };

      const isDropdownVisible = UserDropdown.checkIfDropdownIsVisible(
        dropdownContent.offsetTop,
        dropdownContent.offsetHeight,
      );

      if (!isDropdownVisible) {
        const { offsetTop, offsetHeight } = dropdownTrigger;
        const offsetPageTop = (offsetTop + offsetHeight) - scrollContainer.scrollTop;

        nextState.dropdownOffset = window.innerHeight - offsetPageTop;
        nextState.dropdownDirection = 'bottom';
      }

      this.setState(nextState);
    }
  }

  /**
  * Check if the dropdown is visible and is opened by the user
  *
  * @return True if is visible and opened by the user
  */
  isDropdownActivedByUser() {
    const { isActionsOpen, dropdownVisible } = this.state;

    return isActionsOpen && !dropdownVisible;
  }

  renderUserAvatar() {
    const {
      normalizeEmojiName,
      user,
      userInBreakout,
      breakoutSequence,
      meetingIsBreakout,
      voiceUser,
    } = this.props;

    const { clientType } = user;
    const isVoiceOnly = clientType === 'dial-in-user';

    const iconUser = user.emoji !== 'none'
      ? (<Icon iconName={normalizeEmojiName(user.emoji)} />)
      : user.name.toLowerCase().slice(0, 2);

    const iconVoiceOnlyUser = (<Icon iconName="audio_on" />);
    const userIcon = isVoiceOnly ? iconVoiceOnlyUser : iconUser;

    return (
      <UserAvatar
        moderator={user.role === ROLE_MODERATOR}
        presenter={user.presenter}
        talking={voiceUser.isTalking}
        muted={voiceUser.isMuted}
        listenOnly={voiceUser.isListenOnly}
        voice={voiceUser.isVoiceUser}
        noVoice={!voiceUser.isVoiceUser}
        color={user.color}
      >
        {
        userInBreakout
        && !meetingIsBreakout
          ? breakoutSequence : userIcon}
      </UserAvatar>
    );
  }

  render() {
    const {
      compact,
      currentUser,
      user,
      intl,
      isThisMeetingLocked,
      isMe,
    } = this.props;

    const {
      isActionsOpen,
      dropdownVisible,
      dropdownDirection,
      dropdownOffset,
      showNestedOptions,
    } = this.state;

    const actions = this.getUsersActions();

    const userItemContentsStyle = {};

    userItemContentsStyle[styles.dropdown] = true;
    userItemContentsStyle[styles.userListItem] = !isActionsOpen;
    userItemContentsStyle[styles.usertListItemWithMenu] = isActionsOpen;

    const you = isMe(user.userId) ? intl.formatMessage(messages.you) : '';

    const presenter = (user.presenter)
      ? intl.formatMessage(messages.presenter)
      : '';

    const userAriaLabel = intl.formatMessage(
      messages.userAriaLabel,
      {
        0: user.name,
        1: presenter,
        2: you,
        3: user.emoji,
      },
    );

    const contents = (
      <div
        data-test={isMe(user.userId) ? 'userListItemCurrent' : null}
        className={!actions.length ? styles.userListItem : null}
      >
        <div className={styles.userItemContents}>
          <div className={styles.userAvatar}>
            {this.renderUserAvatar()}
          </div>
          {<UserName
            {...{
              user,
              compact,
              intl,
              isThisMeetingLocked,
              userAriaLabel,
              isActionsOpen,
              isMe,
            }}
          />}
          {<UserIcons
            {...{
              user,
              amIModerator: currentUser.role === ROLE_MODERATOR,
            }}
          />}
        </div>
      </div>
    );

    if (!actions.length) return contents;

    return (
      <Dropdown
        ref={(ref) => { this.dropdown = ref; }}
        keepOpen={isActionsOpen || showNestedOptions}
        onShow={this.onActionsShow}
        onHide={this.onActionsHide}
        className={userItemContentsStyle}
        autoFocus={false}
        aria-haspopup="true"
        aria-live="assertive"
        aria-relevant="additions"
      >
        <DropdownTrigger>
          {contents}
        </DropdownTrigger>
        <DropdownContent
          style={{
            visibility: dropdownVisible ? 'visible' : 'hidden',
            [dropdownDirection]: `${dropdownOffset}px`,
          }}
          className={styles.dropdownContent}
          placement={`right ${dropdownDirection}`}
        >
          <DropdownList
            ref={(ref) => { this.list = ref; }}
            getDropdownMenuParent={this.getDropdownMenuParent}
            onActionsHide={this.onActionsHide}
          >
            {actions}
          </DropdownList>
        </DropdownContent>
      </Dropdown>
    );
  }
}

UserDropdown.propTypes = propTypes;
export default withModalMounter(lockContextContainer(UserDropdown));
