import React, { Component } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import random from '../utils/random';
import { connect } from 'react-redux';
import {
  rollDice,
  takeFromRoll,
  resetRoll,
  roundStart,
  rollAvailable,
  updatePot,
  activePlayerChange
 } from '../actions/gameActions';
import SweetAlert from 'sweetalert-react';
import 'sweetalert/dist/sweetalert.css';
import { addToSelection, updatePlayerStats} from '../actions/optionActions';
import { diceMap } from '../utils/diceMap';
import Dice from './Dice';
import RollUnavailableAlert from './AlertRollUnavailable';
import RoundHasNotBegunAlert from './AlertRoundHasNotBegun';
import { Container,Button} from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDice } from '@fortawesome/free-solid-svg-icons';


class Roll extends Component {
  state = {
    rollAlert: false,
    roundAlert: false
  }

  rollDice = () => {
    if (this.props.game.roundInProgress === false) {
      this.setState({ roundAlert: true });
      return;
    }

    if (this.props.game.rollAvailable) {
      let { currentRoll } = this.props.game;

      let updatedRoll = currentRoll.map(dice => random(1, 6))
      this.props.rollDice(updatedRoll);
      // make roll unavailable until user selects a die.
      this.props.rollAvailable(false);
    } else {
      this.setState({ rollAlert: true });
    }
  }


  takeFromRoll = (diceIdx, diceNum) => {
    let { currentRoll } = this.props.game;
    let { players } = this.props.options;
    let currentPlayer = players.find(player => player.id === this.props.game.activePlayerID)
    let updatedRoll = currentRoll.filter((el,idx) => idx !== diceIdx );

    this.props.takeFromRoll(updatedRoll);
    this.addToSelection(currentPlayer, diceNum);
    // we have taken at least one die here, so we have option to roll again.
    this.props.rollAvailable(true);
  }


  handleTurnCompletion(playersState) {
    let currentPlayer = playersState.find(player => player.id === this.props.game.activePlayerID);
    let hasQualified = this.qualificationHandler(currentPlayer);
    let totalScore = hasQualified ? this.totalScore(currentPlayer) : 0;

    let updatedPlayersState = playersState.map(player => {
      if (player.id === currentPlayer.id) {
        return {
          ...player,
          playedTurn: true,
          scoreTotal: totalScore,
          qualified: hasQualified
        };
      } else {
        return player;
      }
    });

    // change active player
    let nextActivePlayer = this.activePlayerChange();
    this.props.activePlayerChange(nextActivePlayer);

    if (this.roundOver(updatedPlayersState)) {
      this.determineWinner(updatedPlayersState);
      this.props.roundStart(false);
    } else {
      this.props.updatePlayerStats(updatedPlayersState);
    }
  }

  activePlayerChange() {
    let nextActivePlayer = this.props.game.activePlayerID + 1;

    if (nextActivePlayer > this.props.options.players.length) {
      nextActivePlayer = 1;
    }

    return nextActivePlayer;
  }


  roundOver(updatedPlayersState) {
    return updatedPlayersState.every(player => player.playedTurn );
  }

  totalScore(currentPlayer) {
     // subtracting 5 from score due to qualifying dice 1 & 4
    return currentPlayer.selections.reduce((sum,accum) => sum += accum) - 5;
  }


  addToSelection(player, diceNum) {
    let playerSelection = [...player.selections]
    let playersState = this.props.options.players;

    playerSelection.push(diceNum);

    let updatedPlayersState = playersState.map(playerInfo => {
      if (playerInfo.id === player.id) {
        return {
          ...playerInfo,
          selections: playerSelection
        };
      } else {
        return playerInfo;
      }
    });

    if (playerSelection.length === 6) {
      this.handleTurnCompletion(updatedPlayersState);
      this.resetRoll();
    } else {
      this.props.addToSelection(updatedPlayersState);
    }
  }


  resetRoll() {
    let newDiceState = [0,0,0,0,0,0];
    this.props.resetRoll(newDiceState);
  }


  determineWinner(updatedPlayersState) {
    let highestScore = null;
    let winningPlayers = [];
    let index = 0;

    let sortedScores = updatedPlayersState
      .map(player => {
        return {
          ...player,
          selections: [...player.selections]
        };
      })
      .sort((a,b) => {
        return a.scoreTotal > b.scoreTotal ? -1 : 1;
      });

    highestScore = sortedScores[index].scoreTotal;

    while ( (index < sortedScores.length) && (sortedScores[index].scoreTotal === highestScore) ) {
      winningPlayers.push(sortedScores[index]);
      index += 1;
    }

    if (winningPlayers.length === 1) {
      let winningPlayerID = sortedScores[0].id;
      this.payWinner(updatedPlayersState, winningPlayerID);
      this.resetPot();
    } else {
      /* tie game at this point, pot stays the same and continues on into the next round.
      In the event of a tie, the player starting the next round will be chosen
      at random (whereas normally the winner would be starting the next round) */
      let nextPlayerID = random(1, this.props.options.players.length);
      this.newRoundStartingPlayer(nextPlayerID, updatedPlayersState);
    }
  }


  resetPot = () => {
    let newPotState = 0;
    this.props.updatePot(newPotState);
  }


  payWinner(playersState, winnerID) {
    let updatedPlayersState = playersState.map(player => {
      if (player.id === winnerID) {
        return {
          ...player,
          selections: [...player.selections],
          profit: player.profit + this.props.game.pot
        };
      } else {
        return {
          ...player,
          selections: [...player.selections]
        };
      }
    });

    this.newRoundStartingPlayer(winnerID, updatedPlayersState);
  }


  newRoundStartingPlayer(nextPlayerID, playersState) {
    this.props.activePlayerChange(nextPlayerID)
    this.resetPlayerSelections(playersState);
  }


  resetPlayerSelections(playersState) {
    let updatedPlayersState = playersState.map(player => {
      return {
        ...player,
        selections: [],
        playedTurn: false
      };
    });

    this.props.updatePlayerStats(updatedPlayersState);
  }


  qualificationHandler(currentPlayer) {
    let qualifiers = {
      4: false,
      1: false
    };

    currentPlayer.selections.forEach(dice => {
      if (dice === 4) {
        if (qualifiers[4] === false) qualifiers[4] = true;
      } else if (dice === 1) {
        if (qualifiers[1] === false) qualifiers[1] = true;
      }
    });

    return qualifiers[4] && qualifiers[1];
  }


  render() {
    let { currentRoll } = this.props.game;

    return (
      <Container>
        <SweetAlert
          show={this.state.rollAlert}
          title="Rollling Not Allowed"
          html
          text={renderToStaticMarkup(<RollUnavailableAlert />)}
          onConfirm={() => this.setState({ rollAlert: false })}
        />
        <SweetAlert
          show={this.state.roundAlert}
          title="Round has not begun yet..."
          html
          text={renderToStaticMarkup(<RoundHasNotBegunAlert />)}
          onConfirm={() => this.setState({ roundAlert: false })}
        />
        <div className="row">
          <div className="col-md-12 text-center">
            <Button
              className="m-4 roll-dice-btn"
              color="primary"
              onClick={this.rollDice}
            >
              ROLL DICE
              <FontAwesomeIcon className="ml-1" icon={faDice} ></FontAwesomeIcon>
            </Button>
          </div>
        </div>
        <div className="row">
          <div className="col-md-12 text-center">
            {currentRoll.map( (dice,i) => (
              <Dice
                key={`dice${i}`}
                diceNumber={diceMap[dice]}
                take={this.takeFromRoll.bind(this, i, dice)}
              />
            ))}
          </div>
        </div>
      </Container>
    );
  }
}

const mapStateToProps = (state) => ({
  game: state.game,
  options: state.options
});

export default connect(mapStateToProps, {
   rollDice,
   takeFromRoll,
   addToSelection,
   resetRoll,
   updatePlayerStats,
   roundStart,
   rollAvailable,
   updatePot,
   activePlayerChange
 }
)(Roll);
