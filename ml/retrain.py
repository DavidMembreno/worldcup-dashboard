import pandas as pd
import numpy as np
import json
import os
import random
import urllib.request
from datetime import datetime
from collections import Counter
from xgboost import XGBClassifier

# ── paths ────────────────────────────────────────────────────────────────────
BASE     = os.path.dirname(__file__)
HIST     = os.path.join(BASE, 'historical_results.csv')
STATS    = os.path.join(BASE, '..', 'src', 'ml', 'match_stats.json')
OUT      = os.path.join(BASE, '..', 'src', 'ml', 'predictions.json')
HIST_OUT = os.path.join(BASE, '..', 'src', 'ml', 'prediction_history.json')

WC26_TEAMS = [
    'Mexico','South Africa','South Korea','Czech Republic','Canada',
    'Bosnia and Herzegovina','United States','Paraguay','Qatar','Switzerland',
    'Brazil','Morocco','Haiti','Scotland','Australia','Turkey','Germany',
    'Curacao','Netherlands','Japan','Ivory Coast','Ecuador','Sweden','Tunisia',
    'Spain','Cape Verde','Belgium','Egypt','Uruguay','Saudi Arabia','Iran',
    'New Zealand','France','Senegal','Iraq','Norway','Argentina','Algeria',
    'Austria','Jordan','Portugal','DR Congo','England','Croatia','Ghana',
    'Panama','Uzbekistan','Colombia'
]

ESPN_FINISHED = {
    '760415': ('Mexico','South Africa'),
    '760414': ('South Korea','Czechia'),
    '760416': ('Canada','Bosnia-Herzegovina'),
    '760417': ('United States','Paraguay'),
    '760420': ('Qatar','Switzerland'),
    '760419': ('Brazil','Morocco'),
    '760418': ('Haiti','Scotland'),
    '760421': ('Australia','Turkey'),
    '760422': ('Germany','Curacao'),
    '760425': ('Netherlands','Japan'),
    '760423': ('Ivory Coast','Ecuador'),
    '760424': ('Sweden','Tunisia'),
    '760428': ('Spain','Cape Verde'),
    '760426': ('Belgium','Egypt'),
    '760429': ('Uruguay','Saudi Arabia'),
    '760427': ('Iran','New Zealand'),
    '760432': ('France','Senegal'),
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
    'K': ['Portugal','DR Congo','England','Croatia'],
    'L': ['Ghana','Panama','Uzbekistan','Colombia'],
}

# ── 1. ELO ───────────────────────────────────────────────────────────────────
print('Computing Elo ratings...')

def expected(ra, rb):
    return 1 / (1 + 10 ** ((rb - ra) / 400))

def update_elo(ra, rb, result, k=32):
    ea = expected(ra, rb)
    eb = expected(rb, ra)
    sa, sb = (1,0) if result=='home' else (0,1) if result=='away' else (0.5,0.5)
    return ra + k*(sa-ea), rb + k*(sb-eb)

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

with open(STATS) as f:
    match_stats = json.load(f)

for espn_id, (home, away) in ESPN_FINISHED.items():
    stat = match_stats.get(espn_id)
    if not stat: continue
    hg = stat.get('home_score')
    ag = stat.get('away_score')
    if hg is None or ag is None: continue
    if home not in elo: elo[home] = 1500
    if away not in elo: elo[away] = 1500
    result = 'home' if hg > ag else 'away' if hg < ag else 'draw'
    elo[home], elo[away] = update_elo(elo[home], elo[away], result, k=60)

print(f'  Elo computed for {len(elo)} teams')
for t, r in sorted([(t,r) for t,r in elo.items() if t in WC26_TEAMS], key=lambda x:-x[1])[:5]:
    print(f'    {t}: {r:.0f}')

# ── 2. XGBOOST ───────────────────────────────────────────────────────────────
print('\nTraining XGBoost...')

rows = []

for _, row in df.iterrows():
    h, a = row['home_team'], row['away_team']
    hs, as_ = row['home_score'], row['away_score']
    result = 1 if hs > as_ else 0 if hs < as_ else 2
    rows.append({
        'elo_diff': elo.get(h,1500) - elo.get(a,1500),
        'elo_home': elo.get(h,1500),
        'elo_away': elo.get(a,1500),
        'possession_diff': 0,
        'shots_diff': 0,
        'pass_pct_diff': 0,
        'result': result
    })

for espn_id, stat in match_stats.items():
    if stat.get('status') != 'STATUS_FULL_TIME': continue
    home = stat.get('home')
    away = stat.get('away')
    if not home or not away: continue
    hg = stat.get('home_score', 0) or 0
    ag = stat.get('away_score', 0) or 0
    result = 1 if hg > ag else 0 if hg < ag else 2
    row = {
        'elo_diff': elo.get(home,1500) - elo.get(away,1500),
        'elo_home': elo.get(home,1500),
        'elo_away': elo.get(away,1500),
        'possession_diff': float(stat.get('home_possession') or 50) - float(stat.get('away_possession') or 50),
        'shots_diff': float(stat.get('home_shots_on_target') or 3) - float(stat.get('away_shots_on_target') or 3),
        'pass_pct_diff': float(stat.get('home_pass_pct') or 0.8) - float(stat.get('away_pass_pct') or 0.8),
        'result': result
    }
    for _ in range(5):
        rows.append(row)

feat_df = pd.DataFrame(rows).dropna()
X = feat_df[['elo_diff','elo_home','elo_away','possession_diff','shots_diff','pass_pct_diff']]
y = feat_df['result']

xgb = XGBClassifier(n_estimators=100, max_depth=4, learning_rate=0.1,
                    eval_metric='mlogloss', random_state=42, verbosity=0)
xgb.fit(X, y)
print(f'  XGBoost trained on {len(feat_df)} rows ({len(match_stats)} WC26 matches x 5 weight)')

def xgb_predict(home, away, h_poss=50, a_poss=50, h_shots=3, a_shots=3, h_pass=0.8, a_pass=0.8):
    feats = pd.DataFrame([{
        'elo_diff': elo.get(home,1500) - elo.get(away,1500),
        'elo_home': elo.get(home,1500),
        'elo_away': elo.get(away,1500),
        'possession_diff': h_poss - a_poss,
        'shots_diff': h_shots - a_shots,
        'pass_pct_diff': h_pass - a_pass,
    }])
    probs = xgb.predict_proba(feats)[0]
    classes = list(xgb.classes_)
    return {
        'home': float(probs[classes.index(1)]) if 1 in classes else 0.33,
        'away': float(probs[classes.index(0)]) if 0 in classes else 0.33,
        'draw': float(probs[classes.index(2)]) if 2 in classes else 0.34,
    }

def elo_match_probs(home, away):
    eh = elo.get(home, 1500)
    ea = elo.get(away, 1500)
    exp_h = expected(eh, ea)
    draw_prob = 0.28
    return exp_h*(1-draw_prob), draw_prob, (1-exp_h)*(1-draw_prob)

# ── 3. MONTE CARLO ────────────────────────────────────────────────────────────
print('\nRunning Monte Carlo (10,000 sims)...')

def run_monte_carlo(sims=10000):
    trophy_wins = {t: 0 for t in WC26_TEAMS}
    elimination_round = {t: [] for t in WC26_TEAMS}

    def sim_match(home, away):
        hw, dp, aw = elo_match_probs(home, away)
        r = random.random()
        if r < hw: return home
        elif r < hw + dp: return random.choice([home, away])
        else: return away

    def get_group_qualifiers(teams):
        ranked = sorted(teams, key=lambda t: -elo.get(t, 1500))
        return ranked[:2], ranked[2]

    for _ in range(sims):
        qualifiers = []
        third_place = []

        for g, teams in GROUPS.items():
            top2, third = get_group_qualifiers(teams)
            qualifiers.extend(top2)
            third_place.append(third)

        best_thirds = sorted(third_place, key=lambda t: -elo.get(t, 1500))[:8]
        bracket = qualifiers + best_thirds
        random.shuffle(bracket)

        round_name = 'R32'
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

    mc_trophy = {t: round(trophy_wins[t] / sims, 4) for t in WC26_TEAMS}
    avg_elim = {t: Counter(elimination_round[t]).most_common(1)[0][0]
                if elimination_round[t] else 'Group Stage'
                for t in WC26_TEAMS}

    return mc_trophy, avg_elim

mc_probs, mc_elim = run_monte_carlo(10000)
print('  Top 5 Monte Carlo:')
for t, p in sorted(mc_probs.items(), key=lambda x: -x[1])[:5]:
    print(f'    {t}: {p*100:.1f}%')

# ── 4. ENSEMBLE ───────────────────────────────────────────────────────────────
print('\nBuilding ensemble...')

finished_count = len([s for s in match_stats.values()
                      if s.get('status') == 'STATUS_FULL_TIME'])

if finished_count < 24:
    W = {'elo': 0.25, 'xgb': 0.25, 'form': 0.50}
elif finished_count < 48:
    W = {'elo': 0.20, 'xgb': 0.30, 'form': 0.50}
else:
    W = {'elo': 0.15, 'xgb': 0.35, 'form': 0.50}

print(f'  Finished matches: {finished_count} → weights: {W}')

elo_raw = {t: expected(elo.get(t,1500), np.mean([elo.get(x,1500) for x in WC26_TEAMS]))
           for t in WC26_TEAMS}
elo_total = sum(elo_raw.values())
elo_probs = {t: v/elo_total for t,v in elo_raw.items()}

xgb_scores = {}
for t in WC26_TEAMS:
    team_stats = [s for s in match_stats.values()
                  if s.get('status') == 'STATUS_FULL_TIME' and
                  (s.get('home') == t or s.get('away') == t)]
    if not team_stats:
        xgb_scores[t] = 0.5
        continue
    probs = []
    for s in team_stats:
        is_home = s.get('home') == t
        opp = s.get('away') if is_home else s.get('home')
        hp  = float(s.get('home_possession') or 50)
        ap  = float(s.get('away_possession') or 50)
        hsh = float(s.get('home_shots_on_target') or 3)
        ash = float(s.get('away_shots_on_target') or 3)
        hpp = float(s.get('home_pass_pct') or 0.8)
        app = float(s.get('away_pass_pct') or 0.8)
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
for t in WC26_TEAMS:
    pts, gf, ga, played = 0, 0, 0, 0
    for s in match_stats.values():
        if s.get('status') != 'STATUS_FULL_TIME': continue
        if s.get('home') == t:
            hg = s.get('home_score') or 0
            ag = s.get('away_score') or 0
            opp = s.get('away')
            opp_rank = FIFA_RANKINGS.get(opp, 50)
            opp_weight = max(0.5, (51 - opp_rank) / 25)
            gf += hg; ga += ag; played += 1
            base_pts = 3 if hg > ag else 1 if hg == ag else 0
            pts += base_pts * opp_weight
        elif s.get('away') == t:
            hg = s.get('home_score') or 0
            ag = s.get('away_score') or 0
            opp = s.get('home')
            opp_rank = FIFA_RANKINGS.get(opp, 50)
            opp_weight = max(0.5, (51 - opp_rank) / 25)
            gf += ag; ga += hg; played += 1
            base_pts = 3 if ag > hg else 1 if ag == hg else 0
            pts += base_pts * opp_weight
    if played == 0:
        form_scores[t] = 1.0
    else:
        ppg = pts / played
        gd = (gf - ga) / played
        form_scores[t] = ppg + 0.3*gd + 0.1

form_total = sum(max(v, 0.01) for v in form_scores.values())
form_probs = {t: max(form_scores[t],0.01)/form_total for t in WC26_TEAMS}

ensemble = {t: W['elo']*elo_probs[t] + W['xgb']*xgb_probs[t] + W['form']*form_probs[t]
            for t in WC26_TEAMS}
total = sum(ensemble.values())
ensemble = {t: v/total for t,v in ensemble.items()}

print('\nTop 5 ensemble:')
for t,p in sorted(ensemble.items(), key=lambda x:-x[1])[:5]:
    print(f'  {t}: elo={elo_probs[t]*100:.1f}% | xgb={xgb_probs[t]*100:.1f}% | '
          f'form={form_probs[t]*100:.1f}% | ensemble={p*100:.1f}%')

# ── 5. UPCOMING MATCH PREDICTIONS ────────────────────────────────────────────
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
        home = home_comp.get('team',{}).get('displayName','TBD')
        away = away_comp.get('team',{}).get('displayName','TBD')

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
        print(f'  {home} vs {away}: {consensus_team} ({confidence}) '
              f'{hw*100:.0f}% / {dw*100:.0f}% / {aw*100:.0f}%')

except Exception as e:
    print(f'  Could not fetch upcoming: {e}')

# ── 6. WRITE PREDICTIONS ──────────────────────────────────────────────────────
finalist_probs = sorted(
    [{'team':t,'probability':round(p,4)} for t,p in ensemble.items()],
    key=lambda x:-x['probability']
)
winner = finalist_probs[0]

mc_ranked = sorted(
    [{'team':t,'probability':mc_probs[t],'likely_exit':mc_elim[t]} for t in WC26_TEAMS],
    key=lambda x:-x['probability']
)

output = {
    'generated_at': pd.Timestamp.now().isoformat(),
    'model_version': f'day_{finished_count}',
    'matches_used': finished_count,
    'weights': W,
    'tournament_winner': winner,
    'finalist_probabilities': finalist_probs[:10],
    'next_matches': upcoming,
    'elo_ratings': {t: round(elo.get(t,1500),1) for t in WC26_TEAMS},
    'form_scores': {t: round(form_probs[t]*100,2) for t in WC26_TEAMS},
    'xgb_scores': {t: round(xgb_probs[t]*100,2) for t in WC26_TEAMS},
    'monte_carlo': {
        'probabilities': mc_probs,
        'likely_exit': mc_elim,
        'simulations': 10000,
        'ranked': mc_ranked,
        'winner': mc_ranked[0],
    }
}

class NpEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.integer, np.floating)): return obj.item()
        if isinstance(obj, np.ndarray): return obj.tolist()
        return super().default(obj)

with open(OUT,'w') as f:
    json.dump(output, f, indent=2, cls=NpEncoder)

# ── 7. APPEND TO HISTORY ──────────────────────────────────────────────────────
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
        'mc_winner': mc_ranked[0]['team'],
        'mc_probability': mc_ranked[0]['probability'],
        'top5': finalist_probs[:5],
        'matches_used': finished_count,
        'weights': W,
    })
    with open(HIST_OUT, 'w') as f:
        json.dump(history, f, indent=2, cls=NpEncoder)
    print(f'History updated: {len(history)} entries')

print(f'\nDone. Ensemble winner: {winner["team"]} ({winner["probability"]*100:.1f}%)')
print(f'Monte Carlo winner: {mc_ranked[0]["team"]} ({mc_ranked[0]["probability"]*100:.1f}%)')
print(f'Output → {OUT}')
