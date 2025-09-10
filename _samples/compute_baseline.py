#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
from collections import defaultdict


def load_backup(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def sum_numbers(items, key):
    total = 0
    for item in items or []:
        try:
            total += float(item.get(key) or 0)
        except Exception:
            pass
    return total


def compute_store_balances(data):
    stores = data.get('stores') or []
    sales = data.get('sales') or []
    payments = data.get('payments') or []

    store_name_by_id = {s.get('id'): (s.get('name') or s.get('id')) for s in stores}

    sales_by_store = defaultdict(float)
    for s in sales:
        sid = s.get('storeId')
        try:
            sales_by_store[sid] += float(s.get('total') or 0)
        except Exception:
            pass

    pays_by_store = defaultdict(float)
    for p in payments:
        sid = p.get('storeId')
        try:
            pays_by_store[sid] += float(p.get('amount') or 0)
        except Exception:
            pass

    store_ids = set(store_name_by_id.keys()) | set(sales_by_store.keys()) | set(pays_by_store.keys())

    balances = []
    for sid in sorted(store_ids):
        name = store_name_by_id.get(sid) or f"{sid}"
        total_sales = float(sales_by_store.get(sid, 0))
        total_payments = float(pays_by_store.get(sid, 0))
        balance = total_sales - total_payments
        balances.append({
            'storeId': sid,
            'storeName': name,
            'totalSales': total_sales,
            'totalPayments': total_payments,
            'balance': balance,
            'status': 'credit' if balance >= 0 else 'debit'
        })
    return balances


def compute_inventory_values(data):
    packages = {p.get('id'): p for p in (data.get('packages') or [])}
    inventory = data.get('inventory') or []

    total_qty_by_pkg = defaultdict(float)
    for item in inventory:
        try:
            total_qty_by_pkg[item.get('packageId')] += float(item.get('quantity') or 0)
        except Exception:
            pass

    retail_total = wholesale_total = distributor_total = 0.0
    rows = []
    for pkg_id, qty in total_qty_by_pkg.items():
        pkg = packages.get(pkg_id) or {}
        rp = float(pkg.get('retailPrice') or 0)
        wp = float(pkg.get('wholesalePrice') or 0)
        dp = float(pkg.get('distributorPrice') or 0)
        retail_val = qty * rp
        wholesale_val = qty * wp
        distributor_val = qty * dp
        retail_total += retail_val
        wholesale_total += wholesale_val
        distributor_total += distributor_val
        rows.append({
            'packageId': pkg_id,
            'packageName': pkg.get('name') or pkg_id,
            'quantity': qty,
            'retailPrice': rp,
            'wholesalePrice': wp,
            'distributorPrice': dp,
            'retailValue': retail_val,
            'wholesaleValue': wholesale_val,
            'distributorValue': distributor_val,
        })

    totals = {
        'retailValueTotal': retail_total,
        'wholesaleValueTotal': wholesale_total,
        'distributorValueTotal': distributor_total,
    }
    return totals, rows


def main():
    base = '/workspace/_samples'
    backup_path = os.path.join(base, 'backup.json')
    out_metrics = os.path.join(base, 'baseline_metrics.json')
    out_store_balances = os.path.join(base, 'store_balances.json')

    payload = load_backup(backup_path)
    data = payload.get('data') or {}

    total_sales = sum_numbers(data.get('sales'), 'total')
    total_payments = sum_numbers(data.get('payments'), 'amount')
    total_expenses = sum_numbers(data.get('expenses'), 'amount')

    net_profit_all_time = total_payments - total_expenses  # مطابق لطريقة updateProfitReport الحالية

    balances = compute_store_balances(data)
    inv_totals, inv_rows = compute_inventory_values(data)

    metrics = {
        'version': payload.get('version'),
        'records': {
            'stores': len(data.get('stores') or []),
            'packages': len(data.get('packages') or []),
            'inventory': len(data.get('inventory') or []),
            'sales': len(data.get('sales') or []),
            'payments': len(data.get('payments') or []),
            'expenses': len(data.get('expenses') or []),
        },
        'totals': {
            'sales': total_sales,
            'payments': total_payments,
            'expenses': total_expenses,
            'netProfit_allTime': net_profit_all_time,
        },
        'inventoryValues': inv_totals,
    }

    # write outputs
    with open(out_metrics, 'w', encoding='utf-8') as f:
        json.dump(metrics, f, ensure_ascii=False, indent=2)

    with open(out_store_balances, 'w', encoding='utf-8') as f:
        json.dump({
            'items': balances,
            'inventoryValuesPerPackage': inv_rows,
        }, f, ensure_ascii=False, indent=2)

    print('OK')


if __name__ == '__main__':
    main()

