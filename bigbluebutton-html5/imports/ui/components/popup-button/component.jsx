import React from 'react';
import { defineMessages, injectIntl, intlShape } from 'react-intl';
import Button from '/imports/ui/components/button/component';
import cx from 'classnames';
import PropTypes from 'prop-types';
import { styles } from './styles';
/*eslint-disable*/

const intlMessages = defineMessages({
  fullscreenButton: {
    id: 'app.fullscreenButton.label',
    description: 'Fullscreen label',
  },
});

const propTypes = {
  intl: intlShape.isRequired,
  fullscreenRef: PropTypes.instanceOf(Element),
  dark: PropTypes.bool,
  bottom: PropTypes.bool,
  isIphone: PropTypes.bool,
  isFullscreen: PropTypes.bool,
  isReduced: PropTypes.bool,
  elementName: PropTypes.string,
  className: PropTypes.string,
  handleToggleFullScreen: PropTypes.func.isRequired,
  tooltipDistance: PropTypes.number,
};

const defaultProps = {
  dark: false,
  bottom: false,
  isIphone: false,
  isFullscreen: false,
  isReduced: false,
  elementName: '',
  className: '',
  fullscreenRef: null,
  tooltipDistance: -1,
};

const PopupButtonComponent = ({
  intl,
  dark,
  bottom,
  elementName,
  tooltipDistance,
  className,
  isIphone,
  isFullscreen,
  reducer,
}) => {
  if (isIphone) return null;

  const formattedLabel = intl.formatMessage(
    intlMessages.fullscreenButton,
    ({ 0: elementName || '' }),
  );

  const wrapperClassName = cx({
    [styles.wrapper]: true,
    [styles.dark]: dark,
    [styles.light]: !dark,
    [styles.top]: !bottom,
    [styles.bottom]: bottom,
  });

  return (
    <div className={wrapperClassName}>
      <Button
        color="default"
        icon={'application'}
        size="sm"
        onClick={reducer}
        label="Insert/remove user from popup window"
        hideLabel
        className={cx(styles.button, styles.fullScreenButton, className)}
        tooltipDistance={tooltipDistance}
        data-test="presentationFullscreenButton"
      />
    </div>
  );
};

PopupButtonComponent.propTypes = propTypes;
PopupButtonComponent.defaultProps = defaultProps;

export default injectIntl(PopupButtonComponent);
