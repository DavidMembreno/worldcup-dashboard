import pandas as pd
import numpy as np
import json
import os
import random
import urllib.request
from datetime import datetime
from collections import Counter
from xgboost import XGBClassifier

BASE     = os.path.dirname(__file__)
HIST     = os.path.join(BASE, 'historical_results.csv')
STATS    = os.path.join(BASE, '..', 'src', 'ml', 'match_stats.json')
OUT      = os.path.join(BASE, '..', 'src', 'ml', 'predictions.json')
HIST_OUT = os.path.join(BASE, '..', 'src', 'ml', 'prediction_history.json')

ALL_TEAMS = [
    'Mexico','South Africa','South Korea','Czech Republic','Canada',
    'Bosnia and Herzegovina','United States','Paraguay','Qatar','Switzerland',
    'Brazil','Morocco','Haiti','Scotland','Australia','Turkey','Germany',
    'Curacao','Netherlands','Japan','Ivory Coast','Ecuador','Sweden','Tunisia',
    'Spain','Cape Verde','Belgium','Egypt','Uruguay','Saudi Arabia','Iran',
    'New Zealand','France','Senegal','Iraq','Norway','Argentina','Algeria',
    'Austria','Jordan','Portugal','DR Congo','England','Croatia','Ghana',
    'Panama','Uzbekistan','Colombia'
]

NAME_MAP = {
    'Bosnia-Herzegovina': 'Bosnia and Herzegovina',
    'Congo DR': 'DR Congo',
    'Czechia': 'Czech Republic',
    'Türkiye': 'Turkey',
}

def norm(name):
    return NAME_MAP.get(name, name)

GROUPS = {
    'A': ['Mexico','South Korea','Czech Republic','South Africa'],
    'B': ['Canada','Bosnia and Herzegovina','Qatar','Switzerland'],
    'C': ['Brazil','Morocco','Haiti','Scotland'],
    'D': ['United States','Australia','Turkey','Paraguay'],
    'E': ['Germany','Ivory Coast','Ecuador','Curacao'],
    'F': ['Netherlands','Japan','Sweden','Tunisia'],
    'G': ['Belgium','New Zealand','Iran','Egypt'],
    'H': ['Spain','Uruguay','Saudi Arabia','Cape Verde'],
    'I': ['France','Senegal','Iraq','Norway'],
    'J': ['Argentina','Algeria','Austria','Jordan'],
    'K': ['Colombia','Portugal','Uzbekistan','DR Congo'],
    'L': ['England','Croatia','Panama','Ghana'],
}

FIFA_RANKINGS = {
    'Argentina': 1, 'France': 2, 'England': 3, 'Brazil': 4,
    'Portugal': 5, 'Spain': 6, 'Netherlands': 7, 'Germany': 8,
    'Belgium': 9, 'Uruguay': 10, 'Colombia': 11, 'Morocco': 12,
    'Japan': 13, 'United States': 14, 'Mexico': 15, 'Croatia': 16,
    'Senegal': 17, 'Iran': 18, 'South Korea': 19, 'Denmark': 20,
    'Austria': 21, 'Sweden': 22, 'Norway': 23, 'Switzerland': 24,
    'Australia': 25, 'Turkey': 26, 'Ecuador': 27, 'Tunisia': 28,
    'Egypt': 29, 'Algeria': 30, 'Scotland': 31, 'Ukraine': 32,
    'Canada': 33, 'Saudi Arabia': 34, 'Qatar': 35, 'Iraq': 36,
    'Ivory Coast': 37, 'Czech Republic': 38, 'New Zealand': 39,
    'South Africa': 40, 'Ghana': 41, 'Bosnia and Herzegovina': 42,
    'Paraguay': 43, 'Panama': 44, 'Bolivia': 45, 'Jordan': 46,
    'Cape Verde': 47, 'Haiti': 48, 'Uzbekistan': 49, 'DR Congo': 50,
    'Curacao': 86, 'Congo DR': 50,
}

# ── helpers ──────────────────────────────────────────────────────────────────
def expected(ra, rb):
    return 1 / (1 + 10 ** ((rb - ra) / 400))

def update_elo(ra, rb, result, k=32):
    ea = expected(ra, rb)
    eb = expected(rb, ra)
    sa, sb = (1,0) if result=='home' else (0,1) if result=='away' else (0.5,0.5)
    return ra + k*(sa-ea), rb + k*(sb-eb)

with open(STATS) as f:
    raw_match_stats = json.load(f)

# normalize all team names up front so everything downstream is consistent
match_stats = {}
for k, v in raw_match_stats.items():
    v = dict(v)
    v['home'] = norm(v.get('home'))
    v['away'] = norm(v.get('away'))
    match_stats[k] = v

finished = {k: v for k, v in match_stats.items() if v.get('status') in ('STATUS_FULL_TIME', 'STATUS_FINAL_PEN')}

# ── 1. DETERMINE WHO IS STILL ALIVE ──────────────────────────────────────────
print('Determining tournament survivors...')

def get_result(team, m):
    is_home = m['home'] == team
    gf = m.get('home_score') if is_home else m.get('away_score')
    ga = m.get('away_score') if is_home else m.get('home_score')
    if gf is None or ga is None:
        return None
    return 'W' if gf > ga else 'D' if gf == ga else 'L'

# group stage standings from real finished matches only
group_results = {g: {t: {'pts':0,'gf':0,'ga':0,'played':0} for t in teams} for g, teams in GROUPS.items()}
for g, teams in GROUPS.items():
    for m in finished.values():
        if m['home'] in teams and m['away'] in teams:
            hg, ag = m.get('home_score',0) or 0, m.get('away_score',0) or 0
            group_results[g][m['home']]['gf'] += hg
            group_results[g][m['home']]['ga'] += ag
            group_results[g][m['home']]['played'] += 1
            group_results[g][m['home']]['pts'] += 3 if hg>ag else 1 if hg==ag else 0
            group_results[g][m['away']]['gf'] += ag
            group_results[g][m['away']]['ga'] += hg
            group_results[g][m['away']]['played'] += 1
            group_results[g][m['away']]['pts'] += 3 if ag>hg else 1 if ag==hg else 0

# a group is "complete" once all 6 round-robin matches for it have been played
group_complete = {}
group_standings = {}
for g, teams in GROUPS.items():
    stats = group_results[g]
    played_counts = [stats[t]['played'] for t in teams]
    group_complete[g] = all(p >= 3 for p in played_counts)
    ranked = sorted(teams, key=lambda t: (-stats[t]['pts'], -(stats[t]['gf']-stats[t]['ga']), -stats[t]['gf']))
    group_standings[g] = ranked

# Real R32 bracket from ESPN — hardcoded since group qualification logic
# is complex (third-place tiebreakers, etc). These are the actual 32 qualifiers.
R32_BRACKET = {
    '760486': ('South Africa', 'Canada'),
    '760487': ('Brazil', 'Japan'),
    '760488': ('Netherlands', 'Morocco'),
    '760489': ('Germany', 'Paraguay'),
    '760490': ('Ivory Coast', 'Norway'),
    '760491': ('Mexico', 'Ecuador'),
    '760492': ('France', 'Sweden'),
    '760493': ('Belgium', 'Senegal'),
    '760494': ('United States', 'Bosnia and Herzegovina'),
    '760495': ('England', 'DR Congo'),
    '760496': ('Portugal', 'Croatia'),
    '760497': ('Spain', 'Austria'),
    '760498': ('Switzerland', 'Algeria'),
    '760499': ('Australia', 'Egypt'),
    '760500': ('Argentina', 'Cape Verde'),
    '760501': ('Colombia', 'Ghana'),
}
qualifiers_r32 = set()
for home, away in R32_BRACKET.values():
    qualifiers_r32.add(home)
    qualifiers_r32.add(away)

num_complete = sum(group_complete.values())
print(f'  Groups fully complete: {num_complete}/12')
print(f'  R32 qualifiers: {len(qualifiers_r32)} teams')
groups_done = num_complete >= 10
# fetch live R32 results directly from ESPN to determine real knockout eliminations
def get_live_knockout_survivors(pool):
    alive = set(pool)
    try:
        r32_event_ids = [str(i) for i in range(760486, 760518)]
        for espn_id in r32_event_ids:
            url = f'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event={espn_id}'
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5) as r:
                data = json.loads(r.read().decode())
            comp = data.get('header', {}).get('competitions', [{}])[0]
            status = comp.get('status', {}).get('type', {}).get('name', '')
            if status not in ('STATUS_FULL_TIME', 'STATUS_FINAL_PEN'):
                continue
            competitors = comp.get('competitors', [])
            home = next((c for c in competitors if c.get('homeAway') == 'home'), {})
            away = next((c for c in competitors if c.get('homeAway') == 'away'), {})
            home_name = norm(home.get('team', {}).get('displayName', ''))
            away_name = norm(away.get('team', {}).get('displayName', ''))
            home_score = int(home.get('score', 0) or 0)
            away_score = int(away.get('score', 0) or 0)
            # in pen shootouts ESPN score is regulation score, check winner via winner field
            home_winner = home.get('winner', False)
            away_winner = away.get('winner', False)
            if home_name in pool and away_name in pool:
                if home_winner:
                    alive.discard(away_name)
                elif away_winner:
                    alive.discard(home_name)
                elif home_score > away_score:
                    alive.discard(away_name)
                elif away_score > home_score:
                    alive.discard(home_name)
    except Exception as e:
        print(f'  Warning: could not fetch live knockout data: {e}')
    return alive

if groups_done:
    survivors = get_live_knockout_survivors(qualifiers_r32)
else:
    survivors = set()
    for g, teams in GROUPS.items():
        for t in teams:
            losses = sum(1 for m in finished.values() if (m['home']==t or m['away']==t) and get_result(t,m)=='L')
            if losses < 2:
                survivors.add(t)

ELIMINATED = set(ALL_TEAMS) - survivors
ACTIVE_TEAMS = [t for t in ALL_TEAMS if t in survivors]

print(f'  Groups complete: {groups_done}')
print(f'  Active teams remaining: {len(ACTIVE_TEAMS)}')
print(f'  Eliminated: {sorted(ELIMINATED)}')

# ── 2. ELO (computed for ALL teams historically, but only ACTIVE teams get predictions) ──
print('\nComputing Elo ratings...')

df = pd.read_csv(HIST)
df = df.dropna(subset=['home_score','away_score'])
df['date'] = pd.to_datetime(df['date'])
df = df[df['date'] >= '2025-01-01'].copy()

elo = {}
for _, row in df.iterrows():
    h, a = row['home_team'], row['away_team']
    if h not in elo: elo[h] = 1500
    if a not in elo: elo[a] = 1500
    result = 'home' if row['home_score'] > row['away_score'] else \
             'away' if row['home_score'] < row['away_score'] else 'draw'
    elo[h], elo[a] = update_elo(elo[h], elo[a], result, k=40)

for m in finished.values():
    home, away = m['home'], m['away']
    hg, ag = m.get('home_score'), m.get('away_score')
    if hg is None or ag is None: continue
    if home not in elo: elo[home] = 1500
    if away not in elo: elo[away] = 1500
    result = 'home' if hg > ag else 'away' if hg < ag else 'draw'
    elo[home], elo[away] = update_elo(elo[home], elo[away], result, k=60)

print(f'  Elo computed for {len(elo)} teams')
for t, r in sorted([(t,r) for t,r in elo.items() if t in ACTIVE_TEAMS], key=lambda x:-x[1])[:5]:
    print(f'    {t}: {r:.0f}')

# ── 3. XGBOOST ────────────────────────────────────────────────────────────────
print('\nTraining XGBoost...')

rows = []
for _, row in df.iterrows():
    h, a = row['home_team'], row['away_team']
    hs, as_ = row['home_score'], row['away_score']
    result = 1 if hs > as_ else 0 if hs < as_ else 2
    rows.append({
        'elo_diff': elo.get(h,1500) - elo.get(a,1500),
        'elo_home': elo.get(h,1500), 'elo_away': elo.get(a,1500),
        'possession_diff': 0, 'shots_diff': 0, 'pass_pct_diff': 0, 'result': result
    })
for m in finished.values():
    home, away = m['home'], m['away']
    hg, ag = m.get('home_score',0) or 0, m.get('away_score',0) or 0
    result = 1 if hg > ag else 0 if hg < ag else 2
    row = {
        'elo_diff': elo.get(home,1500) - elo.get(away,1500),
        'elo_home': elo.get(home,1500), 'elo_away': elo.get(away,1500),
        'possession_diff': float(m.get('home_possession') or 50) - float(m.get('away_possession') or 50),
        'shots_diff': float(m.get('home_shots_on_target') or 3) - float(m.get('away_shots_on_target') or 3),
        'pass_pct_diff': float(m.get('home_pass_pct') or 0.8) - float(m.get('away_pass_pct') or 0.8),
        'result': result
    }
    for _ in range(5): rows.append(row)

feat_df = pd.DataFrame(rows).dropna()
X = feat_df[['elo_diff','elo_home','elo_away','possession_diff','shots_diff','pass_pct_diff']]
y = feat_df['result']
xgb = XGBClassifier(n_estimators=100, max_depth=4, learning_rate=0.1,
                    eval_metric='mlogloss', random_state=42, verbosity=0)
xgb.fit(X, y)
print(f'  XGBoost trained on {len(feat_df)} rows ({len(finished)} WC26 matches x 5 weight)')
importances = dict(zip(X.columns, xgb.feature_importances_))
print('  XGBoost feature importances:')
for feat, imp in sorted(importances.items(), key=lambda x: -x[1]):
    print(f'    {feat}: {imp*100:.1f}%')

def xgb_predict(home, away, h_poss=50, a_poss=50, h_shots=3, a_shots=3, h_pass=0.8, a_pass=0.8):
    feats = pd.DataFrame([{
        'elo_diff': elo.get(home,1500) - elo.get(away,1500),
        'elo_home': elo.get(home,1500), 'elo_away': elo.get(away,1500),
        'possession_diff': h_poss - a_poss, 'shots_diff': h_shots - a_shots, 'pass_pct_diff': h_pass - a_pass,
    }])
    probs = xgb.predict_proba(feats)[0]
    classes = list(xgb.classes_)
    return {
        'home': float(probs[classes.index(1)]) if 1 in classes else 0.33,
        'away': float(probs[classes.index(0)]) if 0 in classes else 0.33,
        'draw': float(probs[classes.index(2)]) if 2 in classes else 0.34,
    }

def elo_match_probs(home, away):
    eh, ea = elo.get(home, 1500), elo.get(away, 1500)
    exp_h = expected(eh, ea)
    draw_prob = 0.28
    return exp_h*(1-draw_prob), draw_prob, (1-exp_h)*(1-draw_prob)

# ── 4. MONTE CARLO — simulates from CURRENT real bracket state ───────────────
print('\nRunning Monte Carlo (10,000 sims) from current bracket state...')

def run_monte_carlo(sims=10000):
    trophy_wins = {t: 0 for t in ACTIVE_TEAMS}
    elimination_round = {t: [] for t in ACTIVE_TEAMS}

    def sim_match(home, away):
        hw, dp, aw = elo_match_probs(home, away)
        r = random.random()
        if r < hw: return home
        elif r < hw + dp: return random.choice([home, away])
        else: return away

    def simulate_group(teams):
        points = {t: 0 for t in teams}
        gd = {t: 0 for t in teams}
        for i in range(len(teams)):
            for j in range(i+1, len(teams)):
                a, b = teams[i], teams[j]
                hw, dp, aw = elo_match_probs(a, b)
                r = random.random()
                if r < hw: points[a] += 3
                elif r < hw+dp: points[a] += 1; points[b] += 1
                else: points[b] += 3
        ranked = sorted(teams, key=lambda t: (-points[t], -elo.get(t,1500)))
        return ranked

    for _ in range(sims):
        if groups_done:
            # start directly from current real bracket
            bracket = list(ACTIVE_TEAMS)
        else:
            # simulate remaining group matches to get a full set of qualifiers
            qualifiers = []
            third_pool = []
            for g, teams in GROUPS.items():
                ranked = simulate_group(teams)
                qualifiers.extend(ranked[:2])
                third_pool.append(ranked[2])
            best_thirds = sorted(third_pool, key=lambda t: -elo.get(t,1500))[:8]
            bracket = qualifiers + best_thirds
            bracket = [t for t in bracket if t in ACTIVE_TEAMS] or list(ACTIVE_TEAMS)

        random.shuffle(bracket)
        round_name = 'R32' if len(bracket) > 16 else 'R16' if len(bracket) > 8 else 'QF' if len(bracket) > 4 else 'SF' if len(bracket) > 2 else 'Final'

        while len(bracket) > 1:
            next_round = []
            for i in range(0, len(bracket), 2):
                if i + 1 < len(bracket):
                    winner = sim_match(bracket[i], bracket[i+1])
                    loser = bracket[i] if winner == bracket[i+1] else bracket[i+1]
                    elimination_round[loser].append(round_name)
                else:
                    winner = bracket[i]
                next_round.append(winner)
            bracket = next_round
            round_name = {'R32':'R16','R16':'QF','QF':'SF','SF':'Final','Final':'Champion'}.get(round_name, round_name)

        if bracket:
            trophy_wins[bracket[0]] += 1

    mc_trophy = {t: round(trophy_wins[t] / sims, 4) for t in ACTIVE_TEAMS}
    avg_elim = {t: Counter(elimination_round[t]).most_common(1)[0][0]
                if elimination_round[t] else 'Champion'
                for t in ACTIVE_TEAMS}
    return mc_trophy, avg_elim

mc_probs, mc_elim = run_monte_carlo(10000)
print('  Top 5 Monte Carlo:')
for t, p in sorted(mc_probs.items(), key=lambda x: -x[1])[:5]:
    print(f'    {t}: {p*100:.1f}%')

# ── 5. ENSEMBLE — active teams only ───────────────────────────────────────────
print('\nBuilding ensemble...')

finished_count = len(finished)
if finished_count < 24:
    W = {'elo': 0.25, 'xgb': 0.25, 'form': 0.50}
elif finished_count < 48:
    W = {'elo': 0.20, 'xgb': 0.30, 'form': 0.50}
else:
    W = {'elo': 0.15, 'xgb': 0.35, 'form': 0.50}

print(f'  Finished matches: {finished_count} → weights: {W}')

elo_raw = {t: expected(elo.get(t,1500), np.mean([elo.get(x,1500) for x in ACTIVE_TEAMS])) for t in ACTIVE_TEAMS}
elo_total = sum(elo_raw.values())
elo_probs = {t: v/elo_total for t,v in elo_raw.items()}

xgb_scores = {}
for t in ACTIVE_TEAMS:
    team_stats = [m for m in finished.values() if m['home']==t or m['away']==t]
    if not team_stats:
        xgb_scores[t] = 0.5
        continue
    probs = []
    for m in team_stats:
        is_home = m['home'] == t
        opp = m['away'] if is_home else m['home']
        hp  = float(m.get('home_possession') or 50)
        ap  = float(m.get('away_possession') or 50)
        hsh = float(m.get('home_shots_on_target') or 3)
        ash = float(m.get('away_shots_on_target') or 3)
        hpp = float(m.get('home_pass_pct') or 0.8)
        app = float(m.get('away_pass_pct') or 0.8)
        if not is_home:
            hp,ap = ap,hp
            hsh,ash = ash,hsh
            hpp,app = app,hpp
        p = xgb_predict(t, opp, hp, ap, hsh, ash, hpp, app)
        probs.append(p['home'])
    xgb_scores[t] = float(np.mean(probs))

xgb_total = sum(xgb_scores.values())
xgb_probs = {t: v/xgb_total for t,v in xgb_scores.items()}

form_scores = {}
for t in ACTIVE_TEAMS:
    pts, gf, ga, played = 0, 0, 0, 0
    for m in finished.values():
        if m['home'] == t:
            hg, ag = m.get('home_score') or 0, m.get('away_score') or 0
            opp_rank = FIFA_RANKINGS.get(m['away'], 50)
            w = max(0.5, (51-opp_rank)/25)
            gf+=hg; ga+=ag; played+=1
            pts += (3 if hg>ag else 1 if hg==ag else 0) * w
        elif m['away'] == t:
            hg, ag = m.get('home_score') or 0, m.get('away_score') or 0
            opp_rank = FIFA_RANKINGS.get(m['home'], 50)
            w = max(0.5, (51-opp_rank)/25)
            gf+=ag; ga+=hg; played+=1
            pts += (3 if ag>hg else 1 if ag==hg else 0) * w
    form_scores[t] = 1.0 if played==0 else (pts/played) + 0.3*((gf-ga)/played) + 0.1

form_total = sum(max(v,0.01) for v in form_scores.values())
form_probs = {t: max(form_scores[t],0.01)/form_total for t in ACTIVE_TEAMS}

ensemble = {t: W['elo']*elo_probs[t] + W['xgb']*xgb_probs[t] + W['form']*form_probs[t] for t in ACTIVE_TEAMS}
total = sum(ensemble.values())
ensemble = {t: v/total for t,v in ensemble.items()}

print('\nTop 5 ensemble (active teams only):')
for t,p in sorted(ensemble.items(), key=lambda x:-x[1])[:5]:
    print(f'  {t}: elo={elo_probs[t]*100:.1f}% | xgb={xgb_probs[t]*100:.1f}% | form={form_probs[t]*100:.1f}% | ensemble={p*100:.1f}%')

def build_team_snapshot(t):
    is_active = t in ACTIVE_TEAMS
    tm = [m for m in finished.values() if m['home']==t or m['away']==t]
    def avg_field(field):
        vals = []
        for m in tm:
            is_home = m['home'] == t
            val = m.get(f'home_{field}') if is_home else m.get(f'away_{field}')
            if val is not None:
                vals.append(float(val))
        return round(float(np.mean(vals)), 2) if vals else None
    pass_pct = avg_field('pass_pct')
    return {
        'active': is_active,
        'elo': round(elo.get(t, 1500), 1),
        'form': round(form_probs.get(t, 0) * 100, 2) if is_active else 0,
        'xgb': round(xgb_probs.get(t, 0) * 100, 2) if is_active else 0,
        'mc': round(mc_probs.get(t, 0) * 100, 2) if is_active else 0,
        'ensemble': round(ensemble.get(t, 0) * 100, 4) if is_active else 0,
        'avg_possession': avg_field('possession'),
        'avg_shots': avg_field('shots'),
        'avg_shots_on_target': avg_field('shots_on_target'),
        'avg_pass_pct': round(pass_pct * 100, 1) if pass_pct is not None else None,
        'avg_corners': avg_field('corners'),
        'avg_fouls': avg_field('fouls'),
        'avg_yellows': avg_field('yellows'),
        'avg_saves': avg_field('saves'),
        'avg_tackles': avg_field('tackles'),
        'avg_interceptions': avg_field('interceptions'),
    }

# ── 6. UPCOMING MATCH PREDICTIONS ────────────────────────────────────────────
print('\nPredicting upcoming matches...')
BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world'
upcoming = []

try:
    today = datetime.utcnow().strftime('%Y%m%d')
    req = urllib.request.Request(
        f'{BASE_URL}/scoreboard?dates={today}',
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    with urllib.request.urlopen(req) as r:
        today_data = json.loads(r.read().decode())

    for event in today_data.get('events', []):
        comp = event.get('competitions', [{}])[0]
        if comp.get('status',{}).get('type',{}).get('completed'): continue
        home_comp = next((c for c in comp.get('competitors',[]) if c['homeAway']=='home'), {})
        away_comp = next((c for c in comp.get('competitors',[]) if c['homeAway']=='away'), {})
        home = norm(home_comp.get('team',{}).get('displayName','TBD'))
        away = norm(away_comp.get('team',{}).get('displayName','TBD'))

        xgb_p = xgb_predict(home, away)
        elo_p  = elo_match_probs(home, away)

        hw = W['elo']*elo_p[0] + W['xgb']*xgb_p['home'] + W['form']*elo_p[0]
        dw = W['elo']*elo_p[1] + W['xgb']*xgb_p['draw'] + W['form']*elo_p[1]
        aw = W['elo']*elo_p[2] + W['xgb']*xgb_p['away'] + W['form']*elo_p[2]
        tot = hw+dw+aw
        hw,dw,aw = hw/tot, dw/tot, aw/tot

        xgb_call = 'home' if xgb_p['home']>xgb_p['away'] and xgb_p['home']>xgb_p['draw'] else \
                   'away' if xgb_p['away']>xgb_p['home'] and xgb_p['away']>xgb_p['draw'] else 'draw'
        elo_call  = 'home' if elo_p[0]>elo_p[2] and elo_p[0]>elo_p[1] else \
                   'away' if elo_p[2]>elo_p[0] and elo_p[2]>elo_p[1] else 'draw'

        calls = [xgb_call, elo_call]
        top = Counter(calls).most_common(1)[0]
        consensus_result = top[0]
        agreement = top[1]
        consensus_team = home if consensus_result=='home' else away if consensus_result=='away' else 'Draw'
        confidence = 'high' if agreement==2 else 'low'

        upcoming.append({
            'espn_id': event['id'],
            'home': home,
            'away': away,
            'date': event.get('date','')[:10],
            'home_win_prob': round(hw,3),
            'draw_prob': round(dw,3),
            'away_win_prob': round(aw,3),
            'xgboost_pick': home if xgb_call=='home' else away if xgb_call=='away' else 'Draw',
            'elo_pick': home if elo_call=='home' else away if elo_call=='away' else 'Draw',
            'consensus': consensus_team,
            'confidence': confidence,
            'agreement': f'{agreement}/2'
        })
        print(f'  {home} vs {away}: {consensus_team} ({confidence}) {hw*100:.0f}% / {dw*100:.0f}% / {aw*100:.0f}%')

except Exception as e:
    print(f'  Could not fetch upcoming: {e}')

# ── 7. WRITE PREDICTIONS ──────────────────────────────────────────────────────
finalist_probs = sorted(
    [{'team':t,'probability':round(p,4)} for t,p in ensemble.items()],
    key=lambda x:-x['probability']
)
winner = finalist_probs[0] if finalist_probs else {'team': 'TBD', 'probability': 0}

mc_ranked = sorted(
    [{'team':t,'probability':mc_probs[t],'likely_exit':mc_elim[t]} for t in ACTIVE_TEAMS],
    key=lambda x:-x['probability']
)

output = {
    'generated_at': pd.Timestamp.now().isoformat(),
    'model_version': f'day_{finished_count}',
    'matches_used': finished_count,
    'weights': W,
    'active_teams': ACTIVE_TEAMS,
    'eliminated_teams': sorted(ELIMINATED),
    'groups_complete': groups_done,
    'tournament_winner': winner,
    'finalist_probabilities': finalist_probs[:10],
    'next_matches': upcoming,
    'elo_ratings': {t: round(elo.get(t,1500),1) for t in ALL_TEAMS},
    'form_scores': {t: round(form_probs.get(t,0)*100,2) for t in ACTIVE_TEAMS},
    'xgb_scores': {t: round(xgb_probs.get(t,0)*100,2) for t in ACTIVE_TEAMS},
    'monte_carlo': {
        'probabilities': mc_probs,
        'likely_exit': mc_elim,
        'simulations': 10000,
        'ranked': mc_ranked,
        'winner': mc_ranked[0] if mc_ranked else {'team':'TBD','probability':0},
    }
}

class NpEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.integer, np.floating)): return obj.item()
        if isinstance(obj, np.ndarray): return obj.tolist()
        return super().default(obj)

with open(OUT,'w') as f:
    json.dump(output, f, indent=2, cls=NpEncoder)

history = []
if os.path.exists(HIST_OUT):
    with open(HIST_OUT) as f:
        history = json.load(f)

today_str = datetime.utcnow().strftime('%Y-%m-%d')
if not history or history[-1].get('date') != today_str:
    history.append({
        'date': today_str,
        'predicted_winner': winner['team'],
        'probability': winner['probability'],
        'mc_winner': mc_ranked[0]['team'] if mc_ranked else 'TBD',
        'mc_probability': mc_ranked[0]['probability'] if mc_ranked else 0,
        'top5': finalist_probs[:5],
        'matches_used': finished_count,
        'weights': W,
        'active_teams': ACTIVE_TEAMS,
        'team_snapshots': {t: build_team_snapshot(t) for t in ALL_TEAMS}
    })
    with open(HIST_OUT, 'w') as f:
        json.dump(history, f, indent=2, cls=NpEncoder)
    print(f'History updated: {len(history)} entries')

print(f'\nDone. Ensemble winner: {winner["team"]} ({winner["probability"]*100:.1f}%)')
if mc_ranked:
    print(f'Monte Carlo winner: {mc_ranked[0]["team"]} ({mc_ranked[0]["probability"]*100:.1f}%)')
print(f'Output → {OUT}')