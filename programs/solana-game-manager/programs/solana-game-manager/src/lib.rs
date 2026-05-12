use anchor_lang::prelude::*;
use anchor_spl::token::{self, FreezeAccount, Mint, ThawAccount, Token, TokenAccount};

const MAX_QUEUE: usize = 12;

declare_id!("J9TWXt5regfvpX9RSuBy7xSD1k8VTpRWMtBoMS7W1esw");

#[program]
pub mod solana_game_manager {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, authority: Pubkey, base_contract: [u8; 20]) -> Result<()> {
        let manager = &mut ctx.accounts.manager;
        manager.authority = authority;
        manager.base_contract = base_contract;
        manager.game_counter = 0;
        manager.queue_len = 0;
        manager.queue = [Pubkey::default(); MAX_QUEUE];
        manager.bump = ctx.bumps.manager;
        manager.freeze_authority_bump = ctx.bumps.freeze_authority;
        Ok(())
    }

    pub fn queue_agent(ctx: Context<QueueAgent>, nft_id: u64, dwallet_id: [u8; 32], base_address: [u8; 20]) -> Result<()> {
        require!(ctx.accounts.token_account.amount == 1, GameError::NotAnNftTokenAccount);
        require_keys_eq!(ctx.accounts.token_account.owner, ctx.accounts.owner.key(), GameError::OwnerMismatch);
        require_keys_eq!(ctx.accounts.token_account.mint, ctx.accounts.mint.key(), GameError::MintMismatch);

        let manager = &mut ctx.accounts.manager;
        let queue_len = manager.queue_len as usize;
        require!(queue_len < MAX_QUEUE, GameError::QueueFull);
        require!(!manager.queue[..queue_len].contains(&ctx.accounts.agent.key()), GameError::AlreadyQueued);

        let agent = &mut ctx.accounts.agent;
        agent.nft_id = nft_id;
        agent.mint = ctx.accounts.mint.key();
        agent.token_account = ctx.accounts.token_account.key();
        agent.owner = ctx.accounts.owner.key();
        agent.status = AgentStatus::Queued;
        agent.current_game = Pubkey::default();
        agent.slot = 0;
        agent.dwallet_id = dwallet_id;
        agent.base_address = base_address;
        agent.bump = ctx.bumps.agent;

        manager.queue[queue_len] = agent.key();
        manager.queue_len = manager.queue_len.saturating_add(1);

        emit!(AgentQueued { nft_id, mint: agent.mint, owner: agent.owner });
        Ok(())
    }

    pub fn start_game(ctx: Context<StartGame>, game_id: u64) -> Result<()> {
        require_keys_eq!(ctx.accounts.authority.key(), ctx.accounts.manager.authority, GameError::Unauthorized);
        require!(ctx.accounts.manager.queue_len >= 2, GameError::NotEnoughQueuedAgents);
        require_keys_eq!(ctx.accounts.manager.queue[0], ctx.accounts.agent_one.key(), GameError::QueueOrderMismatch);
        require_keys_eq!(ctx.accounts.manager.queue[1], ctx.accounts.agent_two.key(), GameError::QueueOrderMismatch);
        require!(ctx.accounts.agent_one.status == AgentStatus::Queued, GameError::AgentNotQueued);
        require!(ctx.accounts.agent_two.status == AgentStatus::Queued, GameError::AgentNotQueued);
        require_keys_eq!(ctx.accounts.agent_one.token_account, ctx.accounts.token_account_one.key(), GameError::TokenAccountMismatch);
        require_keys_eq!(ctx.accounts.agent_two.token_account, ctx.accounts.token_account_two.key(), GameError::TokenAccountMismatch);

        let signer_seeds: &[&[u8]] = &[b"freeze-authority", &[ctx.accounts.manager.freeze_authority_bump]];
        let signer = &[signer_seeds];

        token::freeze_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            FreezeAccount {
                account: ctx.accounts.token_account_one.to_account_info(),
                mint: ctx.accounts.mint_one.to_account_info(),
                authority: ctx.accounts.freeze_authority.to_account_info(),
            },
            signer,
        ))?;

        token::freeze_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            FreezeAccount {
                account: ctx.accounts.token_account_two.to_account_info(),
                mint: ctx.accounts.mint_two.to_account_info(),
                authority: ctx.accounts.freeze_authority.to_account_info(),
            },
            signer,
        ))?;

        let game = &mut ctx.accounts.game;
        game.id = game_id;
        game.status = GameStatus::Active;
        game.agent_one = ctx.accounts.agent_one.key();
        game.agent_two = ctx.accounts.agent_two.key();
        game.bump = ctx.bumps.game;

        ctx.accounts.agent_one.status = AgentStatus::InGame;
        ctx.accounts.agent_one.current_game = game.key();
        ctx.accounts.agent_one.slot = 1;
        ctx.accounts.agent_two.status = AgentStatus::InGame;
        ctx.accounts.agent_two.current_game = game.key();
        ctx.accounts.agent_two.slot = 2;
        for i in 2..(ctx.accounts.manager.queue_len as usize) {
            ctx.accounts.manager.queue[i - 2] = ctx.accounts.manager.queue[i];
        }
        let old_len = ctx.accounts.manager.queue_len as usize;
        if old_len >= 1 { ctx.accounts.manager.queue[old_len - 1] = Pubkey::default(); }
        if old_len >= 2 { ctx.accounts.manager.queue[old_len - 2] = Pubkey::default(); }
        ctx.accounts.manager.queue_len = ctx.accounts.manager.queue_len.saturating_sub(2);
        ctx.accounts.manager.game_counter = ctx.accounts.manager.game_counter.saturating_add(1);

        emit!(GameStarted { game_id, agent_one: ctx.accounts.agent_one.mint, agent_two: ctx.accounts.agent_two.mint });
        Ok(())
    }

    pub fn approve_base_action(ctx: Context<ApproveBaseAction>, tx_digest: [u8; 32], nonce: u64, base_contract: [u8; 20]) -> Result<()> {
        require_keys_eq!(ctx.accounts.authority.key(), ctx.accounts.manager.authority, GameError::Unauthorized);
        require!(ctx.accounts.game.status == GameStatus::Active, GameError::GameNotActive);
        require!(ctx.accounts.agent.status == AgentStatus::InGame, GameError::AgentNotInGame);
        require_keys_eq!(ctx.accounts.agent.current_game, ctx.accounts.game.key(), GameError::WrongGame);
        require!(base_contract == ctx.accounts.manager.base_contract, GameError::BaseContractNotAllowed);

        let approval = &mut ctx.accounts.approval;
        approval.game = ctx.accounts.game.key();
        approval.agent = ctx.accounts.agent.key();
        approval.tx_digest = tx_digest;
        approval.base_contract = base_contract;
        approval.nonce = nonce;
        approval.approved = true;
        approval.bump = ctx.bumps.approval;

        emit!(BaseActionApproved { game: ctx.accounts.game.key(), agent: ctx.accounts.agent.mint, tx_digest, nonce });
        Ok(())
    }

    pub fn end_game(ctx: Context<EndGame>) -> Result<()> {
        require_keys_eq!(ctx.accounts.authority.key(), ctx.accounts.manager.authority, GameError::Unauthorized);
        require!(ctx.accounts.game.status == GameStatus::Active, GameError::GameNotActive);
        require_keys_eq!(ctx.accounts.agent_one.current_game, ctx.accounts.game.key(), GameError::WrongGame);
        require_keys_eq!(ctx.accounts.agent_two.current_game, ctx.accounts.game.key(), GameError::WrongGame);

        let signer_seeds: &[&[u8]] = &[b"freeze-authority", &[ctx.accounts.manager.freeze_authority_bump]];
        let signer = &[signer_seeds];

        token::thaw_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            ThawAccount {
                account: ctx.accounts.token_account_one.to_account_info(),
                mint: ctx.accounts.mint_one.to_account_info(),
                authority: ctx.accounts.freeze_authority.to_account_info(),
            },
            signer,
        ))?;

        token::thaw_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            ThawAccount {
                account: ctx.accounts.token_account_two.to_account_info(),
                mint: ctx.accounts.mint_two.to_account_info(),
                authority: ctx.accounts.freeze_authority.to_account_info(),
            },
            signer,
        ))?;

        ctx.accounts.game.status = GameStatus::Ended;
        ctx.accounts.agent_one.status = AgentStatus::Completed;
        ctx.accounts.agent_two.status = AgentStatus::Completed;

        emit!(GameEnded { game: ctx.accounts.game.key() });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = payer, space = 8 + GameManager::SPACE, seeds = [b"game-manager"], bump)]
    pub manager: Account<'info, GameManager>,
    /// CHECK: PDA used as SPL Token freeze authority. Must be set as mint freeze authority at mint time.
    #[account(seeds = [b"freeze-authority"], bump)]
    pub freeze_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(nft_id: u64)]
pub struct QueueAgent<'info> {
    #[account(mut, seeds = [b"game-manager"], bump = manager.bump)]
    pub manager: Account<'info, GameManager>,
    #[account(init, payer = owner, space = 8 + AgentState::SPACE, seeds = [b"agent", mint.key().as_ref()], bump)]
    pub agent: Account<'info, AgentState>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub mint: Account<'info, Mint>,
    pub token_account: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct StartGame<'info> {
    #[account(mut, seeds = [b"game-manager"], bump = manager.bump)]
    pub manager: Account<'info, GameManager>,
    #[account(init, payer = authority, space = 8 + GameState::SPACE, seeds = [b"game", game_id.to_le_bytes().as_ref()], bump)]
    pub game: Account<'info, GameState>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub agent_one: Account<'info, AgentState>,
    #[account(mut)]
    pub agent_two: Account<'info, AgentState>,
    #[account(mut)]
    pub token_account_one: Account<'info, TokenAccount>,
    #[account(mut)]
    pub token_account_two: Account<'info, TokenAccount>,
    #[account(mut)]
    pub mint_one: Account<'info, Mint>,
    #[account(mut)]
    pub mint_two: Account<'info, Mint>,
    /// CHECK: Program PDA used as token freeze authority.
    #[account(seeds = [b"freeze-authority"], bump = manager.freeze_authority_bump)]
    pub freeze_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(tx_digest: [u8; 32], nonce: u64, base_contract: [u8; 20])]
pub struct ApproveBaseAction<'info> {
    #[account(seeds = [b"game-manager"], bump = manager.bump)]
    pub manager: Account<'info, GameManager>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub game: Account<'info, GameState>,
    pub agent: Account<'info, AgentState>,
    #[account(init, payer = authority, space = 8 + BaseActionApproval::SPACE, seeds = [b"approval", game.key().as_ref(), agent.key().as_ref(), nonce.to_le_bytes().as_ref()], bump)]
    pub approval: Account<'info, BaseActionApproval>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EndGame<'info> {
    #[account(seeds = [b"game-manager"], bump = manager.bump)]
    pub manager: Account<'info, GameManager>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub game: Account<'info, GameState>,
    #[account(mut)]
    pub agent_one: Account<'info, AgentState>,
    #[account(mut)]
    pub agent_two: Account<'info, AgentState>,
    #[account(mut)]
    pub token_account_one: Account<'info, TokenAccount>,
    #[account(mut)]
    pub token_account_two: Account<'info, TokenAccount>,
    #[account(mut)]
    pub mint_one: Account<'info, Mint>,
    #[account(mut)]
    pub mint_two: Account<'info, Mint>,
    /// CHECK: Program PDA used as token freeze authority.
    #[account(seeds = [b"freeze-authority"], bump = manager.freeze_authority_bump)]
    pub freeze_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct GameManager {
    pub authority: Pubkey,
    pub base_contract: [u8; 20],
    pub game_counter: u64,
    pub queue_len: u8,
    pub queue: [Pubkey; MAX_QUEUE],
    pub bump: u8,
    pub freeze_authority_bump: u8,
}
impl GameManager { pub const SPACE: usize = 32 + 20 + 8 + 1 + (32 * MAX_QUEUE) + 1 + 1; }

#[account]
pub struct AgentState {
    pub nft_id: u64,
    pub mint: Pubkey,
    pub token_account: Pubkey,
    pub owner: Pubkey,
    pub status: AgentStatus,
    pub current_game: Pubkey,
    pub slot: u8,
    pub dwallet_id: [u8; 32],
    pub base_address: [u8; 20],
    pub bump: u8,
}
impl AgentState { pub const SPACE: usize = 8 + 32 + 32 + 32 + 1 + 32 + 1 + 32 + 20 + 1; }

#[account]
pub struct GameState {
    pub id: u64,
    pub status: GameStatus,
    pub agent_one: Pubkey,
    pub agent_two: Pubkey,
    pub bump: u8,
}
impl GameState { pub const SPACE: usize = 8 + 1 + 32 + 32 + 1; }

#[account]
pub struct BaseActionApproval {
    pub game: Pubkey,
    pub agent: Pubkey,
    pub tx_digest: [u8; 32],
    pub base_contract: [u8; 20],
    pub nonce: u64,
    pub approved: bool,
    pub bump: u8,
}
impl BaseActionApproval { pub const SPACE: usize = 32 + 32 + 32 + 20 + 8 + 1 + 1; }

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum AgentStatus { Queued, InGame, Completed }

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum GameStatus { Active, Ended }

#[event]
pub struct AgentQueued { pub nft_id: u64, pub mint: Pubkey, pub owner: Pubkey }

#[event]
pub struct GameStarted { pub game_id: u64, pub agent_one: Pubkey, pub agent_two: Pubkey }

#[event]
pub struct BaseActionApproved { pub game: Pubkey, pub agent: Pubkey, pub tx_digest: [u8; 32], pub nonce: u64 }

#[event]
pub struct GameEnded { pub game: Pubkey }

#[error_code]
pub enum GameError {
    #[msg("Signer is not the game manager authority.")]
    Unauthorized,
    #[msg("Token account does not look like an NFT account.")]
    NotAnNftTokenAccount,
    #[msg("Token account owner does not match signer.")]
    OwnerMismatch,
    #[msg("Token account mint does not match mint account.")]
    MintMismatch,
    #[msg("Agent is not queued.")]
    AgentNotQueued,
    #[msg("Token account does not match agent state.")]
    TokenAccountMismatch,
    #[msg("Game is not active.")]
    GameNotActive,
    #[msg("Agent is not in the active game.")]
    AgentNotInGame,
    #[msg("Agent belongs to a different game.")]
    WrongGame,
    #[msg("Base contract is not allowlisted.")]
    BaseContractNotAllowed,
    #[msg("The queue is full.")]
    QueueFull,
    #[msg("Agent is already queued.")]
    AlreadyQueued,
    #[msg("Not enough queued agents to start.")]
    NotEnoughQueuedAgents,
    #[msg("Selected agents do not match the front of the queue.")]
    QueueOrderMismatch,
}
