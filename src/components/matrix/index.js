import React from 'react';
import immutable, { List } from 'immutable';
import classnames from 'classnames';
import propTypes from 'prop-types';

import style from './index.less';
import { isClear, want } from '../../unit/';
import { fillLine, blankLine } from '../../unit/const';
import states from '../../control/states';

const t = setTimeout;

export default class Matrix extends React.Component {
  constructor() {
    super();
    this.state = {
      clearLines: false,
      animateColor: 2,
      isOver: false,
      overState: null,
    };
  }
  componentWillReceiveProps(nextProps = {}) {
    const clears = isClear(nextProps.matrix);
    const overs = nextProps.reset;
    this.setState({
      clearLines: clears,
      isOver: overs,
    });
    if (clears && !this.state.clearLines) {
      this.clearAnimate(clears);
    }
    if (!clears && overs && !this.state.isOver) {
      this.over(nextProps);
    }
  }
  shouldComponentUpdate(nextProps = {}) { // 使用Immutable 比较两个List 是否相等
    const props = this.props;
    return !(
      immutable.is(nextProps.matrix, props.matrix) &&
      immutable.is(
        (nextProps.cur && nextProps.cur.shape),
        (props.cur && props.cur.shape)
      ) &&
      immutable.is(
        (nextProps.cur && nextProps.cur.xy),
        (props.cur && props.cur.xy)
      )
    ) || this.state.clearLines
    || this.state.isOver;
  }
  getResult(props = this.props) {
    const cur = props.cur;
    const shape = cur && cur.shape;
    const xy = cur && cur.xy;

    let matrix = props.matrix;
    const clearLines = this.state.clearLines;
    if (clearLines) {
      const animateColor = this.state.animateColor;
      clearLines.forEach((index) => {
        matrix = matrix.set(index, List([
          animateColor,
          animateColor,
          animateColor,
          animateColor,
          animateColor,
          animateColor,
          animateColor,
          animateColor,
          animateColor,
          animateColor,
        ]));
      });
    } else if (shape) {
      // Calculate Ghost Piece position
      let ghostXy = xy;
      while (want({ shape, xy: [ghostXy.get(0) + 1, ghostXy.get(1)] }, props.matrix)) {
        ghostXy = ghostXy.set(0, ghostXy.get(0) + 1);
      }

      // Draw Ghost Piece (value 3)
      shape.forEach((m, k1) => {
        m.forEach((n, k2) => {
          if (n && ghostXy.get(0) + k1 >= 0) {
            const y = ghostXy.get(0) + k1;
            const x = ghostXy.get(1) + k2;
            if (matrix.getIn([y, x]) === 0) { // Only draw ghost on empty cells
              matrix = matrix.setIn([y, x], 3);
            }
          }
        });
      });


      // Draw Current Piece (values 1 or 2) - potentially overwriting ghost
      shape.forEach((m, k1) => (
        m.forEach((n, k2) => {
          if (n && xy.get(0) + k1 >= 0) { // 竖坐标可以为负
            const y = xy.get(0) + k1;
            const x = xy.get(1) + k2;
            let color;
            // Check if the target cell on the matrix already has a block (but not ghost)
            if (matrix.getIn([y, x]) === 1 && !clearLines) {
              // Check for existing block (1), ignore ghost (3)
              color = 2; // Collision color
            } else if (matrix.getIn([y, x]) !== 3) {
              // Don't overwrite ghost piece unless it's the actual piece position
              color = 1; // Normal color
            } else {
              color = matrix.getIn([y, x]); // Keep ghost color if current piece isn't here yet
            }
            // Only set color if it's 1 or 2 (current piece or collision)
            if (color === 1 || color === 2) {
              matrix = matrix.setIn([y, x], color);
            }
          }
        })
      ));
    }
    return matrix;
  }
  clearAnimate() {
    const anima = (callback) => {
      t(() => {
        this.setState({
          animateColor: 0,
        });
        t(() => {
          this.setState({
            animateColor: 2,
          });
          if (typeof callback === 'function') {
            callback();
          }
        }, 100);
      }, 100);
    };
    anima(() => {
      anima(() => {
        anima(() => {
          t(() => {
            states.clearLines(this.props.matrix, this.state.clearLines);
          }, 100);
        });
      });
    });
  }
  over(nextProps) {
    let overState = this.getResult(nextProps);
    this.setState({
      overState,
    });

    const exLine = (index) => {
      if (index <= 19) {
        overState = overState.set(19 - index, List(fillLine));
      } else if (index >= 20 && index <= 39) {
        overState = overState.set(index - 20, List(blankLine));
      } else {
        states.overEnd();
        return;
      }
      this.setState({
        overState,
      });
    };

    for (let i = 0; i <= 40; i++) {
      t(exLine.bind(null, i), 40 * (i + 1));
    }
  }
  render() {
    let matrix;
    if (this.state.isOver) {
      matrix = this.state.overState;
    } else {
      matrix = this.getResult();
    }
    return (
      <div className={style.matrix}>{
          matrix.map((p, k1) => (<p key={k1}>
            {
              p.map((e, k2) => <b
                className={classnames({
                  c: e === 1, // Current piece color
                  d: e === 2, // Collision color
                  ghost: e === 3, // Ghost piece color
                })}
                key={k2}
              />)
            }
          </p>))
      }
      </div>
    );
  }
}

Matrix.propTypes = {
  matrix: propTypes.object.isRequired,
  cur: propTypes.object,
  reset: propTypes.bool.isRequired,
};
