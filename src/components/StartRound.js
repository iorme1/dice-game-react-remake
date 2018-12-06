import React, { Component } from 'react';
import { Container, Button } from 'reactstrap';
import { connect } from 'react-redux';
import { updatePlayerStats } from '../actions/optionActions';
import { roundStart } from '../actions/gameActions';

class StartRound extends Component {
    startGame = () => {
      if (this.props.game.roundInProgress) {
        alert('Round is already in progress...');
        return;
      }

      let { stakeAmount } = this.props.options;

      this.setPlayerAntes(stakeAmount)
      this.props.roundStart(true)
    }


    setPlayerAntes = (stakeAmount) => {
      let playersState = this.props.options.players;

      let updatedPlayersState = playersState.map(player => {
        return  {
          ...player,
          profit: player.profit - stakeAmount
        };
      });

      this.props.updatePlayerStats(updatedPlayersState);
    }


    render() {
      return (
        <Container style={{textAlign: 'center'}}>
          <Button
          color="success"
          onClick={this.startGame}
          >
            Start Round
          </Button>
        </Container>
      );
    }
}
const mapStateToProps = (state) => ({
  options: state.options,
  game: state.game
});

export default connect(mapStateToProps, { updatePlayerStats, roundStart })(StartRound);
