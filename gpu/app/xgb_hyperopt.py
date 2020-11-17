"""
Adapted from optuna/examples/xgboost_cv.py
See these links for what various people consider important hypers. I'm including as many from these sources
as possible, and spreading their value-ranges to include the ranges proposed in each source.

https://towardsdatascience.com/fine-tuning-xgboost-in-python-like-a-boss-b4543ed8b1e
https://www.analyticsvidhya.com/blog/2016/03/complete-guide-parameter-tuning-xgboost-with-codes-python/
https://github.com/optuna/optuna/blob/master/examples/xgboost_cv.py
"""

import os
import shutil

import sklearn.datasets
import sklearn.metrics
import xgboost as xgb
from xgboost import XGBRegressor

import optuna

import pdb, math
import pandas as pd
import numpy as np
from common.database import engine
from collections import OrderedDict

SEED = 42
N_FOLDS = 3
N_TRIALS = 300

def feature_importances(xgb_model, cols, target=None):
    """
    :param xgb_model: trained xgboost model
    :param x: the x DataFrame it was trained on, used to extract column names
    :param y: if provided, put y back into the returned results (eg for data consistency)
    :return:
    """
    imps = [float(v) for v in xgb_model.feature_importances_]

    # FIXME
    # /xgboost/sklearn.py:695: RuntimeWarning: invalid value encountered in true_divide return all_features / all_features.sum()
    # I think this is due to target having no different value, in which case
    # just leave like this.
    imps = [0. if np.isnan(imp) else imp for imp in imps]

    # put target col back in
    if target:
        imps.insert(cols.index(target), 0.0)
    imps = np.array(imps)
    idx = np.argsort(imps)[::-1]
    return OrderedDict(zip(cols[idx], imps[idx]))

class XGBHyperOpt:
    def __init__(self, data):
        self.data = data
        self.i = 0
        self.results = []
        self.writing = False

    # FYI: Objective functions can take additional arguments
    # (https://optuna.readthedocs.io/en/stable/faq.html#objective-func-additional-args).
    def objective(self, trial):
        i = self.i
        x, y = self.data[i]
        y = y.fillna(np.mean(y))  # TODO use default specified by user

        # See https://www.kaggle.com/rafjaa/dealing-with-very-small-datasets#t2 for small dataset hypers

        args = {
            # early_stopping_rounds range: [10] [100]
            "early_stopping_rounds": trial.suggest_int("early_stopping_rounds", 10, 100, step=10),
            # n_estimators/num_boost_round ranges: [100, 1000] [10000]
            # https://stackoverflow.com/q/48051749/362790
            "num_boost_round": trial.suggest_int("num_boost_round", 100, 1000, step=100)
        }

        base_param = {
            "verbosity": 0,
            "objective": "reg:squarederror",
            "eval_metric": "mae",
        }

        param = {}
        # -- From Optuna --
        param["lambda"] = trial.suggest_float("lambda", 1e-8, 1.0)
        param["alpha"] = trial.suggest_float("alpha", 1e-8, 1.0)
        # eta/learning_rate ranges: [0.05, 0.31, 0.05] [0.01, 1.] [.01, .2] [1e-8, 1.0]
        param["eta"] = trial.suggest_float("eta", 1e-8, 1.0)
        # max_depth ranges: [5, 16] [2, 15] [1, 9]
        param["max_depth"] = trial.suggest_int("max_depth", 2, 10)
        # gamma ranges: [.01, 5] [0, 5] [1e-8, 1.]
        param["gamma"] = trial.suggest_float("gamma", 1e-8, 5.)
        param["grow_policy"] = trial.suggest_categorical("grow_policy", ["depthwise", "lossguide"])

        # -- From towardsdatascience --
        # min_child_weight ranges: [1, 8]
        param["min_child_weight"] = trial.suggest_int("min_child_weight", 1, 8)
        # colsample_bytree ranges: [.3, .8] [.3, 1.]
        param["colsample_bytree"] = trial.suggest_float("colsample_bytree", .3, 1., step=.1)
        # subsample ranges: [.8, 1.] [.7, 1.]
        param["subsample"] = trial.suggest_float("subsample", .7, 1.)

        dtrain = xgb.DMatrix(x, label=y)
        xgb_cv_results = xgb.cv(
            params={**base_param, **param},
            dtrain=dtrain,
            nfold=N_FOLDS,
            seed=SEED,
            verbose_eval=False,
            **args
        )

        # 41d91fed: n_estimators from len(xgb_cv_results), save to csv

        best_score = next(
            (s for s in xgb_cv_results["test-mae-mean"].values[::-1]
            if s and not np.isnan(s)),
            None
        )
        if not best_score or np.isnan(best_score):
            pdb.set_trace()
            return None

        self.results.append({
            'score': best_score,
            'rows': x.shape[0],
            'cols': x.shape[1],
            'study': f'study-{i}',
            **param, **args
        })
        try:
            df = pd.DataFrame(self.results).sort_values("score")
        except: return
        if df.shape[0] > 10 and not self.writing:
            self.writing = True
            df.to_sql('xgb_hypers', engine, if_exists='replace')
            self.writing = False

            # Show importances of xgboost hypers (meta)
            # c4efd732: CatBoost
            # TODO use study.feature_importances, not my own
            x_ = df.drop(columns=['score', 'study'])
            x_['grow_policy'] = x_.grow_policy.apply(lambda s: {"depthwise": 0, "lossguide": 1}[s]).astype(int)
            model = XGBRegressor(
                max_depth=2,
                gamma=2,
                eta=0.8,
                reg_alpha=0.5,
                reg_lambda=0.5
            ).fit(x_, df.score)
            print("\nFeature Importances\n", feature_importances(model, x_.columns))

        return best_score

    def optimize(self):
        for i, data in enumerate(self.data):
            self.i = i
            study = optuna.create_study()
            study.optimize(self.objective, n_trials=N_TRIALS, n_jobs=-1) #, timeout=600)
