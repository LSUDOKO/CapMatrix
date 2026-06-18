// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IAaveV3Pool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24  fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params) external returns (uint256 amountOut);
}

contract CloveAutoDeposit {

    // ── Sepolia testnet addresses ─────────────────────────────────────────────
    // Aave's USDC token (Aave v3 Sepolia only accepts this, not Circle's USDC).
    address public constant USDC             = 0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8;
    // aUSDC — Aave's interest-bearing USDC (minted by Aave pool on supply).
    address public constant A_USDC           = 0x16dA4541aD1807f4443d92D26044C1147406EB80;
    address public constant AAVE_V3          = 0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951;
    address public constant UNISWAP_ROUTER   = 0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E;
    address public constant WETH             = 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14;

    address public immutable OPERATOR;

    event Deposited(address indexed user, string protocol, uint256 amount);
    event Withdrawn(address indexed user, string protocol, uint256 amount);
    event Returned(address indexed user, uint256 amount, string reason);

    modifier onlyOperator() {
        require(msg.sender == OPERATOR, "Not operator");
        _;
    }

    constructor(address _operator) {
        require(_operator != address(0), "Zero operator");
        OPERATOR = _operator;
    }

    function forward(address user, string calldata protocol, uint256 amount) external onlyOperator {
        require(user != address(0), "Zero user");
        require(amount > 0, "Zero amount");
        require(IERC20(USDC).balanceOf(address(this)) >= amount, "Insufficient USDC");

        bytes32 p = keccak256(bytes(protocol));

        if      (p == keccak256("aave"))    { _depositAave(user, amount); }
        else if (p == keccak256("uniswap")) { _swapUniswap(USDC, WETH, 3000, user, amount); }
        else {
            IERC20(USDC).transfer(user, amount);
            emit Returned(user, amount, protocol);
            return;
        }

        emit Deposited(user, protocol, amount);
    }

    function withdraw(address user, string calldata protocol, uint256 amount) external onlyOperator {
        require(user != address(0), "Zero user");
        require(amount > 0, "Zero amount");

        bytes32 p = keccak256(bytes(protocol));

        if      (p == keccak256("aave"))    { _withdrawAave(user, amount); }
        else if (p == keccak256("uniswap")) { _swapBack(WETH, USDC, 3000, user, amount); }
        else { revert("Unknown protocol"); }

        emit Withdrawn(user, protocol, amount);
    }

    function _depositAave(address user, uint256 amount) internal {
        IERC20(USDC).approve(AAVE_V3, amount);
        IAaveV3Pool(AAVE_V3).supply(USDC, amount, user, 0);
    }

    function _swapUniswap(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn) internal {
        IERC20(tokenIn).approve(UNISWAP_ROUTER, amountIn);
        IUniswapV3Router(UNISWAP_ROUTER).exactInputSingle(
            IUniswapV3Router.ExactInputSingleParams({
                tokenIn:           tokenIn,
                tokenOut:          tokenOut,
                fee:               fee,
                recipient:         recipient,
                amountIn:          amountIn,
                amountOutMinimum:  0,
                sqrtPriceLimitX96: 0
            })
        );
    }

    function _withdrawAave(address user, uint256 usdcAmount) internal {
        IERC20(A_USDC).transferFrom(user, address(this), usdcAmount);
        IERC20(A_USDC).approve(AAVE_V3, usdcAmount);
        IAaveV3Pool(AAVE_V3).withdraw(USDC, usdcAmount, user);
    }

    function _swapBack(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn) internal {
        IERC20(tokenIn).transferFrom(recipient, address(this), amountIn);
        _swapUniswap(tokenIn, tokenOut, fee, recipient, amountIn);
    }

    function usdcBalance() external view returns (uint256) {
        return IERC20(USDC).balanceOf(address(this));
    }

    function userAaveBalance(address user) external view returns (uint256) {
        return IERC20(A_USDC).balanceOf(user);
    }

    function forwardSwap(address user, address tokenOut, uint24 fee, uint256 amount) external onlyOperator {
        require(user != address(0) && tokenOut != address(0) && amount > 0, "bad args");
        require(IERC20(USDC).balanceOf(address(this)) >= amount, "Insufficient USDC");
        _swapUniswap(USDC, tokenOut, fee == 0 ? 3000 : fee, user, amount);
        emit Deposited(user, "uniswap-copy", amount);
    }

    function recover(address token, address to, uint256 amount) external onlyOperator {
        require(to != address(0), "Zero recipient");
        IERC20(token).transfer(to, amount);
    }
}
