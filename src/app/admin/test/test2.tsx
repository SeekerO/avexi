"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react';

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const CELL_SIZE = 30;

type Cell = number;
type Board = Cell[][];
type Tetromino = number[][];

interface Position {
    x: number;
    y: number;
}

const TETROMINOES: { [key: number]: { shape: Tetromino; color: string } } = {
    1: { shape: [[1, 1, 1, 1]], color: '#a8d5e2' }, // I - pastel cyan
    2: { shape: [[2, 0, 0], [2, 2, 2]], color: '#b4a7d6' }, // J - pastel blue
    3: { shape: [[0, 0, 3], [3, 3, 3]], color: '#f7c8a0' }, // L - pastel orange
    4: { shape: [[4, 4], [4, 4]], color: '#f9f871' }, // O - pastel yellow
    5: { shape: [[0, 5, 5], [5, 5, 0]], color: '#b8e6b8' }, // S - pastel green
    6: { shape: [[0, 6, 0], [6, 6, 6]], color: '#d4a5d4' }, // T - pastel purple
    7: { shape: [[7, 7, 0], [0, 7, 7]], color: '#f4a5a5' }, // Z - pastel red
};

const createEmptyBoard = (): Board =>
    Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));

const TetrisGame: React.FC = () => {
    const [board, setBoard] = useState<Board>(createEmptyBoard());
    const [currentPiece, setCurrentPiece] = useState<Tetromino | null>(null);
    const [currentType, setCurrentType] = useState<number>(0);
    const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [lines, setLines] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [heldPiece, setHeldPiece] = useState<{ shape: Tetromino; type: number } | null>(null);
    const [canSwap, setCanSwap] = useState(true);
    const [nextPiece, setNextPiece] = useState<{ shape: Tetromino; type: number } | null>(null);
    const lastMoveTime = useRef<number>(Date.now());
    const [isHardDropping, setIsHardDropping] = useState(false);
    const [hardDropPosition, setHardDropPosition] = useState<Position | null>(null);
    const [showPauseModal, setShowPauseModal] = useState(false);

    const getRandomTetromino = useCallback(() => {
        const types = Object.keys(TETROMINOES).map(Number);
        const type = types[Math.floor(Math.random() * types.length)];
        return { shape: TETROMINOES[type].shape, type };
    }, []);

    const rotatePiece = (piece: Tetromino): Tetromino => {
        const rows = piece.length;
        const cols = piece[0].length;
        const rotated: Tetromino = Array.from({ length: cols }, () => Array(rows).fill(0));

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                rotated[c][rows - 1 - r] = piece[r][c];
            }
        }
        return rotated;
    };

    const canMove = useCallback((piece: Tetromino, newPos: Position, checkBoard: Board): boolean => {
        for (let r = 0; r < piece.length; r++) {
            for (let c = 0; c < piece[r].length; c++) {
                if (piece[r][c] !== 0) {
                    const newY = newPos.y + r;
                    const newX = newPos.x + c;

                    if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
                        return false;
                    }

                    if (newY >= 0 && checkBoard[newY][newX] !== 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    }, []);

    const getGhostPosition = useCallback((piece: Tetromino, pos: Position): Position => {
        let ghostPos = { ...pos };
        while (canMove(piece, { x: ghostPos.x, y: ghostPos.y + 1 }, board)) {
            ghostPos.y++;
        }
        return ghostPos;
    }, [board, canMove]);

    const mergePieceToBoard = useCallback((piece: Tetromino, pos: Position, type: number): Board => {
        const newBoard = board.map(row => [...row]);

        for (let r = 0; r < piece.length; r++) {
            for (let c = 0; c < piece[r].length; c++) {
                if (piece[r][c] !== 0) {
                    const y = pos.y + r;
                    const x = pos.x + c;
                    if (y >= 0) {
                        newBoard[y][x] = type;
                    }
                }
            }
        }
        return newBoard;
    }, [board]);

    const clearLines = useCallback((checkBoard: Board): { newBoard: Board; linesCleared: number } => {
        let linesCleared = 0;
        const newBoard = checkBoard.filter(row => {
            const isFull = row.every(cell => cell !== 0);
            if (isFull) linesCleared++;
            return !isFull;
        });

        while (newBoard.length < BOARD_HEIGHT) {
            newBoard.unshift(Array(BOARD_WIDTH).fill(0));
        }

        return { newBoard, linesCleared };
    }, []);

    const spawnNewPiece = useCallback(() => {
        if (!nextPiece) {
            const piece = getRandomTetromino();
            setNextPiece(getRandomTetromino());

            const startX = Math.floor((BOARD_WIDTH - piece.shape[0].length) / 2);
            const startY = 0;

            if (!canMove(piece.shape, { x: startX, y: startY }, board)) {
                setGameOver(true);
                return;
            }

            setCurrentPiece(piece.shape);
            setCurrentType(piece.type);
            setPosition({ x: startX, y: startY });
            setCanSwap(true);
            return;
        }

        const piece = nextPiece;
        setNextPiece(getRandomTetromino());

        const startX = Math.floor((BOARD_WIDTH - piece.shape[0].length) / 2);
        const startY = 0;

        if (!canMove(piece.shape, { x: startX, y: startY }, board)) {
            setGameOver(true);
            return;
        }

        setCurrentPiece(piece.shape);
        setCurrentType(piece.type);
        setPosition({ x: startX, y: startY });
        setCanSwap(true);
    }, [board, canMove, getRandomTetromino, nextPiece]);

    const holdPiece = useCallback(() => {
        if (!currentPiece || gameOver || isPaused || !canSwap || !gameStarted) return;

        if (heldPiece === null) {
            setHeldPiece({ shape: TETROMINOES[currentType].shape, type: currentType });
            spawnNewPiece();
            setCanSwap(false);
        } else {
            const tempShape = heldPiece.shape;
            const tempType = heldPiece.type;

            setHeldPiece({ shape: TETROMINOES[currentType].shape, type: currentType });

            const startX = Math.floor((BOARD_WIDTH - tempShape[0].length) / 2);
            const startY = 0;

            if (!canMove(tempShape, { x: startX, y: startY }, board)) {
                setGameOver(true);
                return;
            }

            setCurrentPiece(tempShape);
            setCurrentType(tempType);
            setPosition({ x: startX, y: startY });
            setCanSwap(false);
        }
    }, [currentPiece, currentType, heldPiece, board, canMove, canSwap, gameOver, isPaused, gameStarted, spawnNewPiece]);

    const moveDown = useCallback(() => {
        if (!currentPiece || gameOver || isPaused || !gameStarted || isHardDropping) return;

        const newPos = { x: position.x, y: position.y + 1 };

        if (canMove(currentPiece, newPos, board)) {
            setPosition(newPos);
            lastMoveTime.current = Date.now();
        } else {
            const mergedBoard = mergePieceToBoard(currentPiece, position, currentType);
            const { newBoard, linesCleared } = clearLines(mergedBoard);

            setBoard(newBoard);
            setLines(prev => prev + linesCleared);
            setScore(prev => prev + (linesCleared * linesCleared * 100 * level));
            setLevel(prev => Math.floor((lines + linesCleared) / 10) + 1);

            spawnNewPiece();
            lastMoveTime.current = Date.now();
        }
    }, [currentPiece, position, board, gameOver, isPaused, gameStarted, isHardDropping, canMove, mergePieceToBoard, clearLines, spawnNewPiece, currentType, level, lines]);

    const moveHorizontal = useCallback((dir: number) => {
        if (!currentPiece || gameOver || isPaused || !gameStarted || isHardDropping) return;

        const newPos = { x: position.x + dir, y: position.y };
        if (canMove(currentPiece, newPos, board)) {
            setPosition(newPos);
        }
    }, [currentPiece, position, board, gameOver, isPaused, gameStarted, isHardDropping, canMove]);

    const rotate = useCallback(() => {
        if (!currentPiece || gameOver || isPaused || !gameStarted || isHardDropping) return;

        const rotated = rotatePiece(currentPiece);

        // Try original position first
        if (canMove(rotated, position, board)) {
            setCurrentPiece(rotated);
            return;
        }

        // Wall kick - try adjusting position if rotation is blocked
        const kicks = [
            { x: -1, y: 0 }, // Try left
            { x: 1, y: 0 },  // Try right
            { x: -2, y: 0 }, // Try 2 spaces left
            { x: 2, y: 0 },  // Try 2 spaces right
            { x: 0, y: -1 }, // Try up
        ];

        for (const kick of kicks) {
            const newPos = { x: position.x + kick.x, y: position.y + kick.y };
            if (canMove(rotated, newPos, board)) {
                setCurrentPiece(rotated);
                setPosition(newPos);
                return;
            }
        }
    }, [currentPiece, position, board, gameOver, isPaused, gameStarted, isHardDropping, canMove]);

    const hardDrop = useCallback(() => {
        if (!currentPiece || gameOver || isPaused || !gameStarted || isHardDropping) return;

        let dropPos = { ...position };
        while (canMove(currentPiece, { x: dropPos.x, y: dropPos.y + 1 }, board)) {
            dropPos.y++;
        }

        setIsHardDropping(true);
        setHardDropPosition(dropPos);

        // Animate the drop
        const steps = dropPos.y - position.y;
        const animationSpeed = 0
        let currentStep = 0;

        const animate = setInterval(() => {
            currentStep++;
            if (currentStep <= steps) {
                setPosition({ x: position.x, y: position.y + currentStep });
            } else {
                clearInterval(animate);

                const mergedBoard = mergePieceToBoard(currentPiece, dropPos, currentType);
                const { newBoard, linesCleared } = clearLines(mergedBoard);

                setBoard(newBoard);
                setLines(prev => prev + linesCleared);
                setScore(prev => prev + (linesCleared * linesCleared * 100 * level) + steps * 2);
                setLevel(prev => Math.floor((lines + linesCleared) / 10) + 1);

                spawnNewPiece();
                lastMoveTime.current = Date.now();
                setIsHardDropping(false);
                setHardDropPosition(null);
            }
        }, animationSpeed);
    }, [currentPiece, position, board, gameOver, isPaused, gameStarted, isHardDropping, canMove, mergePieceToBoard, clearLines, spawnNewPiece, currentType, level, lines]);

    const startGame = () => {
        setBoard(createEmptyBoard());
        setScore(0);
        setLevel(1);
        setLines(0);
        setGameOver(false);
        setIsPaused(false);
        setShowPauseModal(false);
        setHeldPiece(null);
        setCanSwap(true);
        setGameStarted(true);
        setNextPiece(getRandomTetromino());

        const { shape, type } = getRandomTetromino();
        const startX = Math.floor((BOARD_WIDTH - shape[0].length) / 2);
        setCurrentPiece(shape);
        setCurrentType(type);
        setPosition({ x: startX, y: 0 });
        lastMoveTime.current = Date.now();
    };

    const resumeGame = () => {
        setIsPaused(false);
        setShowPauseModal(false);
        lastMoveTime.current = Date.now();
    };

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (!gameStarted || gameOver) return;

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    moveHorizontal(-1);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    moveHorizontal(1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    moveDown();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    rotate();
                    break;
                case ' ':
                    e.preventDefault();
                    hardDrop();
                    break;
                case 'p':
                case 'P':
                    setIsPaused(prev => !prev);
                    break;
                case 'Escape':
                    e.preventDefault();
                    if (isPaused && showPauseModal) {
                        // If already paused and modal is showing, resume
                        setIsPaused(false);
                        setShowPauseModal(false);
                    } else if (!isPaused) {
                        // If not paused, pause and show modal
                        setIsPaused(true);
                        setShowPauseModal(true);
                    }
                    break;
                case 'c':
                case 'C':
                case 'Shift':
                    e.preventDefault();
                    holdPiece();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [moveHorizontal, moveDown, rotate, hardDrop, holdPiece, gameOver, gameStarted]);

    useEffect(() => {
        if (gameOver || isPaused || !gameStarted) return;

        const speed = Math.max(100, 1000 - (level - 1) * 100);
        const timer = setInterval(() => {
            const timeSinceLastMove = Date.now() - lastMoveTime.current;
            if (timeSinceLastMove >= speed) {
                moveDown();
            }
        }, 50);

        return () => clearInterval(timer);
    }, [moveDown, level, gameOver, isPaused, gameStarted]);

    const renderBoard = () => {
        const displayBoard = board.map(row => [...row]);
        const ghostPos = currentPiece ? getGhostPosition(currentPiece, position) : null;

        if (currentPiece && ghostPos && !gameOver && gameStarted) {
            for (let r = 0; r < currentPiece.length; r++) {
                for (let c = 0; c < currentPiece[r].length; c++) {
                    if (currentPiece[r][c] !== 0) {
                        const y = ghostPos.y + r;
                        const x = ghostPos.x + c;
                        if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH && displayBoard[y][x] === 0) {
                            displayBoard[y][x] = -currentType;
                        }
                    }
                }
            }
        }

        if (currentPiece && !gameOver && gameStarted) {
            for (let r = 0; r < currentPiece.length; r++) {
                for (let c = 0; c < currentPiece[r].length; c++) {
                    if (currentPiece[r][c] !== 0) {
                        const y = position.y + r;
                        const x = position.x + c;
                        if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
                            displayBoard[y][x] = currentType;
                        }
                    }
                }
            }
        }

        return displayBoard.map((row, y) => (
            <div key={y} className="flex">
                {row.map((cell, x) => {
                    const isGhost = cell < 0;
                    const cellType = isGhost ? -cell : cell;
                    return (
                        <div
                            key={`${y}-${x}`}
                            className="border border-gray-800"
                            style={{
                                width: CELL_SIZE,
                                height: CELL_SIZE,
                                backgroundColor: cell ? TETROMINOES[cellType].color : '#1a1a2e',
                                opacity: isGhost ? 0.3 : 1,
                            }}
                        />
                    );
                })}
            </div>
        ));
    };

    const renderPiecePreview = (piece: { shape: Tetromino; type: number } | null, title: string, showUsed: boolean = false) => {
        if (!piece) return null;

        const maxSize = 4;

        return (
            <div className="bg-gray-900 p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-2">
                    {title}{showUsed && !canSwap && ' (Used)'}
                </div>
                <div className="flex flex-col items-center justify-center" style={{ minHeight: maxSize * 20 }}>
                    {piece.shape.map((row, y) => (
                        <div key={y} className="flex">
                            {row.map((cell, x) => (
                                <div
                                    key={`${y}-${x}`}
                                    style={{
                                        width: 20,
                                        height: 20,
                                        backgroundColor: cell ? TETROMINOES[piece.type].color : 'transparent',
                                        opacity: showUsed && !canSwap ? 0.5 : 1,
                                    }}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen w-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 relative">
            <h1 className="text-5xl font-bold text-gray-200 mb-8">TETRIS</h1>

            {!gameStarted ? (
                <div className="text-center">
                    <button
                        onClick={startGame}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-12 py-6 rounded-lg text-2xl font-bold hover:from-purple-700 hover:to-blue-700 transition shadow-lg"
                    >
                        START GAME
                    </button>
                    <div className="mt-8 text-gray-400 text-sm">
                        <div className="mb-2">← → Move | ↑ Rotate | ↓ Soft Drop</div>
                        <div className="mb-2">Space Hard Drop | C/Shift Hold | P Pause</div>
                    </div>
                </div>
            ) : (
                <div className="flex gap-8">
                    <div className="flex flex-col gap-4">
                        {heldPiece && renderPiecePreview(heldPiece, 'HOLD', true)}
                    </div>

                    <div className="bg-black p-4 rounded-lg shadow-2xl">
                        {renderBoard()}
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="bg-gray-900 p-6 rounded-lg text-white min-w-[200px]">
                            <div className="mb-4">
                                <div className="text-sm text-gray-400">SCORE</div>
                                <div className="text-3xl font-bold text-gray-200">{score}</div>
                            </div>
                            <div className="mb-4">
                                <div className="text-sm text-gray-400">LEVEL</div>
                                <div className="text-2xl font-bold text-gray-200">{level}</div>
                            </div>
                            <div className="mb-4">
                                <div className="text-sm text-gray-400">LINES</div>
                                <div className="text-2xl font-bold text-gray-200">{lines}</div>
                            </div>
                        </div>

                        {nextPiece && renderPiecePreview(nextPiece, 'NEXT')}



                        {gameOver && (
                            <div className="bg-gray-800 p-4 rounded-lg text-white text-center">
                                <div className="text-xl font-bold mb-2 text-gray-200">
                                    GAME OVER
                                </div>
                                <button
                                    onClick={startGame}
                                    className="bg-gray-700 text-gray-200 px-6 py-2 rounded font-bold hover:bg-gray-600 transition"
                                >
                                    NEW GAME
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showPauseModal && isPaused && !gameOver && (
                <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg p-8 shadow-2xl max-w-md">
                        <h2 className="text-3xl font-bold text-gray-200 mb-6 text-center">PAUSED</h2>
                        <div className="flex flex-col gap-4">
                            <button
                                onClick={resumeGame}
                                className="bg-green-600 text-white px-8 py-4 rounded-lg text-xl font-bold hover:bg-green-700 transition"
                            >
                                RESUME GAME
                            </button>
                            <button
                                onClick={startGame}
                                className="bg-purple-600 text-white px-8 py-4 rounded-lg text-xl font-bold hover:bg-purple-700 transition"
                            >
                                RETRY
                            </button>
                        </div>
                        <p className="text-gray-400 text-sm mt-4 text-center">Press ESC to resume</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TetrisGame;