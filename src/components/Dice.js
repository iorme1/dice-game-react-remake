import React, { Component } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { connect } from 'react-redux';

class Dice extends Component {
  render() {

    const rollAnimation = 'animated rollIn main-dice';

    return (
      <div className="col-md-1 mt-5">
        <FontAwesomeIcon
          className={rollAnimation}
          icon={this.props.diceNumber}
          size="3x"
          color="white"
          onClick={this.props.take}
        />
      </div>
    );
  }
}


const mapStateToProps = (state) => ({
  options: state.options
})

export default connect(mapStateToProps)(Dice);