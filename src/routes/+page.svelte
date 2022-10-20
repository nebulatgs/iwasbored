<script lang="ts">
	import { connect, type NatsConnection } from 'nats.ws';
	import { onMount } from 'svelte';

	enum GameState {
		Idle = 'Idle',
		WaitingForPlayers = 'WaitingForPlayers',
		Playing = 'Playing',
		Finished = 'Finished'
	}

	let code = '';
	let userId = '';
	let state = GameState.Idle;
	let players: Set<string> = new Set();

	function generateCode() {
		code = Math.random().toString(36).substring(2, 15);
		codeTransform();
	}
	function codeTransform() {
		code = code
			.toUpperCase()
			.replaceAll(/[^A-Z0-9]/g, '')
			.substring(0, 6);
	}

	let nc: NatsConnection | null = null;
	onMount(async () => {
		nc = await connect({
			servers: 'wss://demo.nats.io:8443'
		});
	});

	function createGame() {
		if (!nc) return;
		generateCode();
		joinGame();
	}

	function joinGame() {
		if (!nc) return;
		console.log(code);
		if (code.length !== 6) return;

		userId = crypto.randomUUID();
		const enc = new TextEncoder();
		const dec = new TextDecoder();

		const joinSub = nc.subscribe(`iwasboredgame.${code}.join`, {
			callback: () => {
				if (!nc) return;
				players.clear();
				nc.publish(`iwasboredgame.${code}.hello`, enc.encode(userId));
			}
		});

		const helloSub = nc.subscribe(`iwasboredgame.${code}.hello`, {
			callback: (_, msg) => {
				if (!nc) return;
				const userId = dec.decode(msg.data);

				players.add(userId);
				players = players;
			}
		});

		const startSub = nc.subscribe(`iwasboredgame.${code}.start`, {
			callback: () => {
				helloSub.unsubscribe();
				joinSub.unsubscribe();
				startSub.unsubscribe();
				state = GameState.Playing;
			}
		});

		const endSub = nc.subscribe(`iwasboredgame.${code}.end`, {
			callback: () => {
				endSub.unsubscribe();
				state = GameState.Finished;
			}
		});

		nc.publish(`iwasboredgame.${code}.join`);
		state = GameState.WaitingForPlayers;
	}

	function startGame() {
		if (!nc) return;
		nc.publish(`iwasboredgame.${code}.start`);
	}

	function endGame() {
		if (!nc) return;
		nc.publish(`iwasboredgame.${code}.end`);
	}

	function resetState() {
		code = '';
		userId = '';
		players.clear();
		state = GameState.Idle;
	}
</script>

<div class="min-w-screen min-h-screen bg-[#F7C1BB] grid place-items-center">
	<div class="flex flex-col">
		{#if nc}
			{#if state === GameState.Idle}
				<h1 class="font-button text-6xl font-semibold text-[#191716] mb-10 text-center">
					I Was Bored
				</h1>
				<div class="mb-3">
					<input
						type="text"
						name="code"
						placeholder="Game Code"
						class="disabled:brightness-50 outline-none font-button p-2 text-2xl text-center text-[#191716] py-1 bg-[#F7F7FF] rounded-md shadow-md"
						bind:value={code}
						on:input={codeTransform}
					/>
				</div>
				<div class="flex items-center justify-between px-5">
					<button
						class="font-button uppercase p-3 text-[#191716] py-1 bg-[#F7F7FF] border-[#FF0054] border-2 rounded-lg shadow-[2px_2px_0_#FF0054] hover:shadow-[1px_1px_0_#FF0054] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-y-[2px] active:translate-x-[2px] transition-all duration-100 ease-in-out"
						on:click={createGame}
					>
						Create
					</button>

					<button
						class="font-button uppercase p-3 text-[#191716] py-1 bg-[#F7F7FF] border-[#004FFF] border-2 rounded-lg shadow-[2px_2px_0_#004FFF] hover:shadow-[1px_1px_0_#004FFF] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-y-[2px] active:translate-x-[2px] transition-all duration-100 ease-in-out"
						on:click={joinGame}
					>
						Join
					</button>
				</div>
			{:else if state === GameState.WaitingForPlayers}
				<h1 class="font-button text-6xl font-semibold text-[#191716] mb-10 text-center">
					Waiting For Players
				</h1>
				<h2 class="font-button text-3xl font-semibold text-[#191716] mb-3 text-center">
					{code}
				</h2>
				<h2 class="font-button text-3xl text-[#191716] mb-3 text-center">
					<strong>{players.size}</strong> player{players.size === 1 ? '' : 's'} connected.
				</h2>
				<div class="w-full items-center justify-center inline-flex">
					<button
						class="font-button uppercase p-3 text-[#191716] py-1 bg-[#F7F7FF] border-[#FF0054] border-2 rounded-lg shadow-[2px_2px_0_#FF0054] hover:shadow-[1px_1px_0_#FF0054] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-y-[2px] active:translate-x-[2px] transition-all duration-100 ease-in-out"
						on:click={startGame}
					>
						Start
					</button>
				</div>
			{:else if state === GameState.Playing}
				<div class="w-full items-center justify-center inline-flex">
					<button
						class="font-button uppercase p-3 text-[#191716] py-1 bg-[#F7F7FF] border-[#FF0054] border-2 rounded-lg shadow-[2px_2px_0_#FF0054] hover:shadow-[1px_1px_0_#FF0054] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-y-[2px] active:translate-x-[2px] transition-all duration-100 ease-in-out"
						on:click={endGame}
					>
						End
					</button>
				</div>
			{:else if state === GameState.Finished}
				<h1 class="font-button text-6xl font-semibold text-[#191716] mb-10 text-center">
					Game Ended
				</h1>
				<div class="w-full items-center justify-center inline-flex">
					<button
						class="font-button uppercase p-3 text-[#191716] py-1 bg-[#F7F7FF] border-[#004FFF] border-2 rounded-lg shadow-[2px_2px_0_#004FFF] hover:shadow-[1px_1px_0_#004FFF] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-y-[2px] active:translate-x-[2px] transition-all duration-100 ease-in-out"
						on:click={resetState}
					>
						Home
					</button>
				</div>
			{/if}
		{:else}
			<h1 class="font-button text-6xl font-semibold text-[#191716] mb-10 text-center">
				Loading...
			</h1>
		{/if}
	</div>
</div>
