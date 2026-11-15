/** Compact, lossless EXPECTATION DELTAS of all 13 original multi-event sequences.
 * Reconstruct expected full states by merging each delta into previous state.
 * Original source fixture SHA256: fa595167fe35ef78dc70032968c5d6c3d8c143d36b2ac712a4060bf4c99d87ff
 * Archive SHA256: df08990efe3c715f0f98f60f6c700e5f9231843b12800f7f52ad625bee3cc661
 * Classification: DERIVED_SEQUENCE, NOT runtime observed. No implicit scheduling.
 */
import type { LevelingLifecycleEvent, LevelingLifecycleState } from "../../src/game/reference/lifecycle-state";
export interface LifecycleFixtureStep { event: LevelingLifecycleEvent; delta: Partial<LevelingLifecycleState> }
export interface LifecycleFixture { id: string; initial: LevelingLifecycleState; steps: readonly LifecycleFixtureStep[] }
const BASE: LevelingLifecycleState = {
  level: 1, level_add: 0, stock: 0, cost: 100, obtain_limit: Math.fround(Math.fround(0.0035) * 100),
  limit_ratio: Math.fround(0.0035), max_level: 100, max_level_add: 50, live: true,
  artifact_active: false, queue: 0, random_queue: 0, special_queue: 0,
  pending: null, select_on: false, return_count: 0, return_ratio: 1,
};
const s = (patch: Partial<LevelingLifecycleState> = {}): LevelingLifecycleState => ({ ...BASE, ...patch });
const t = (event: LevelingLifecycleEvent, delta: Partial<LevelingLifecycleState> = {}): LifecycleFixtureStep => ({ event, delta });
const gain = (amount: number): LevelingLifecycleEvent => ({ op: "gain", amount });
const on: LevelingLifecycleEvent = { op: "gate_on" };
const accept: LevelingLifecycleEvent = { op: "accept_ordinary" };
const refresh: LevelingLifecycleEvent = { op: "mode2_refresh" };
const ability: LevelingLifecycleEvent = { op: "ability_queue_tail", scene_present_add: "Ability" };
const exit = (repay_num: number): LevelingLifecycleEvent => ({ op: "exit", repay_num });
const ratio: LevelingLifecycleEvent = { op: "create_return_ratio_block" };
const dequeue: LevelingLifecycleEvent = { op: "startup_dequeue_block", existing_kind: "primary" };
const add = (value: number): LevelingLifecycleEvent => ({ op: "startup_additional_reconstruction", magic_add_levels_1_to_9: Array(9).fill(value) });
const restore = (stock: number, cost: number, level_add: number, queue: number, obtain_limit: number): LevelingLifecycleEvent => ({
  op: "restore_mana_block", level: 2, level_add, stock, cost, obtain_limit, queue,
});
export const LIFECYCLE_FIXTURES: readonly LifecycleFixture[] = [
  { id: "large_gain_explicit_reentries", initial: s(), steps: [
    t(gain(500), { stock:400, pending:"primary" }), t(on,{select_on:true}),
    t(accept,{level:2,pending:null,select_on:false}), t(refresh,{cost:136,obtain_limit:0.47600001096725464}),
    t(ability), t(gain(0),{stock:264,pending:"primary"}), t(on,{select_on:true}),
    t(accept,{level:3,pending:null,select_on:false}), t(refresh,{cost:173,obtain_limit:0.6055000424385071}),
    t(gain(0),{stock:91,pending:"primary"}), t(on,{select_on:true}),
    t(accept,{level:4,pending:null,select_on:false}), t(refresh,{cost:212,obtain_limit:0.7420000433921814}),
    t(gain(0)),
  ]},
  { id: "artifact_gate_then_explicit_gain0", initial: s(), steps: [
    t({op:"artifact_visibility",active:true},{artifact_active:true}), t(gain(500),{stock:500}),
    t({op:"artifact_visibility",active:false},{artifact_active:false}), t(gain(0),{stock:400,pending:"primary"}),
  ]},
  { id: "fresh_mode1_assigns_not_adds_queue", initial: s({queue:7}), steps: [
    t({op:"mode1_tail",resume:false,start_ability_num:2.5},{queue:2}),
    t(dequeue,{queue:1,pending:"primary"}),t(on,{select_on:true}),
    t(accept,{level:2,pending:null,select_on:false}),t(refresh,{cost:136,obtain_limit:0.47600001096725464}),
    t(ability,{queue:0,pending:"primary"}),
  ]},
  { id: "resume_surplus_boundary", initial: s(), steps: [
    t(restore(500,136,3,2,0.5),{level:2,level_add:3,stock:135,cost:136,obtain_limit:0.5,queue:2}),
    t({op:"mode1_tail",resume:true}),t(dequeue,{queue:1,pending:"primary"}),
  ]},
  { id: "resume_negative_boundary", initial: s(), steps: [
    t(restore(-8,136,3,2,0.5),{level:2,level_add:3,cost:136,obtain_limit:0.5,queue:2}),
    t({op:"mode1_tail",resume:true}),t(dequeue,{queue:1,pending:"primary"}),
  ]},
  { id: "resume_saved_cost_not_mode2_refreshed", initial: s(), steps: [
    t(restore(100,999,0,0,7),{level:2,stock:100,cost:999,obtain_limit:7}),
    t({op:"mode1_tail",resume:true}),t(refresh,{cost:136,obtain_limit:0.47600001096725464}),
  ]},
  { id: "startup_additional_recomputed", initial: s({level:100,level_add:7}), steps: [
    t(add(8),{level_add:9}),t(refresh,{cost:37272352,obtain_limit:130453.234375}),
  ]},
  { id: "startup_full_cap_sentinel_then_gain_ignored", initial: s({level:100}), steps: [
    t(add(0),{level_add:81,cost:99999997952}),t(gain(500)),
  ]},
  { id: "additional_accept_tie_even", initial: s({level:100,level_add:3}), steps: [
    t(gain(100),{cost:30251512,pending:"additional"}),t(on,{select_on:true}),
    t(accept,{level_add:4,pending:null,select_on:false}),t(refresh,{obtain_limit:105880.296875}),
  ]},
  { id: "exit_gate_then_one_surplus_consumption", initial: s({stock:400,pending:"primary"}), steps: [
    t(exit(0)),t(on,{select_on:true}),
    t(exit(0),{stock:300,queue:1,pending:null,select_on:false,return_count:1}),
    t(refresh),t(ability,{queue:0,pending:"primary"}),t(ratio,{return_ratio:0.5}),
  ]},
  { id: "exit_full_repayment_no_level_increment", initial: s({pending:"primary"}), steps: [
    t(on,{select_on:true}),t(exit(100),{queue:1,pending:null,select_on:false,return_count:1}),
    t(refresh),t(ability,{queue:0,pending:"primary"}),
  ]},
  { id: "queue_priority_level_random_special", initial: s({queue:1,random_queue:1,special_queue:1}), steps: [
    t(ability,{queue:0,pending:"primary"}),t(ability,{random_queue:0,pending:"random"}),
    t(ability,{special_queue:0,pending:"special"}),
  ]},
  { id: "return_ratio_count2_and_no_write_count3", initial: s({return_count:2}), steps: [
    t(ratio,{return_ratio:0.20000000298023224}),t(on,{select_on:true}),
    t(exit(0),{select_on:false,return_count:3}),t(ratio),
  ]},
];
export const LIFECYCLE_FIXTURE_META = {
  authority: "STATIC_DERIVED_NOT_RUNTIME_OBSERVED",
  archiveSha256: "df08990efe3c715f0f98f60f6c700e5f9231843b12800f7f52ad625bee3cc661",
  originalFixtureSha256: "fa595167fe35ef78dc70032968c5d6c3d8c143d36b2ac712a4060bf4c99d87ff",
  totalSequences: 13,
  totalTransitions: 58,
} as const;
