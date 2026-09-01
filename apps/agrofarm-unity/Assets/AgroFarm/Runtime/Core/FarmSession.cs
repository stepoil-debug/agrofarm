using System;
using System.Collections.Generic;
using UnityEngine;

namespace AgroFarm
{
    [DisallowMultipleComponent]
    public sealed class FarmSession : MonoBehaviour
    {
        public static FarmSession Instance { get; private set; }

        [SerializeField] private FarmBalanceConfig balance;
        private readonly Dictionary<string, int> inventory = new(StringComparer.OrdinalIgnoreCase);
        private FarmSaveSystem saveSystem;
        private FarmSaveData save;

        public event Action StateChanged;
        public FarmBalanceConfig Balance => balance;
        public FarmSaveData Save => save;
        public float Coins => save?.coins ?? 0f;
        public int Level => save?.level ?? 1;
        public GameMode Mode => save?.mode ?? GameMode.Free;
        public FarmTool SelectedTool => save?.selectedTool ?? FarmTool.Hoe;
        public CropKind SelectedCrop => save?.selectedCrop ?? CropKind.Corn;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }

            Instance = this;
            balance ??= FarmBalanceConfig.CreateRuntimeDefault();
            balance.BuildLookups();
            saveSystem = GetComponent<FarmSaveSystem>() ?? gameObject.AddComponent<FarmSaveSystem>();
            save = saveSystem.LoadOrCreate(balance);
            BuildInventoryLookup();
        }

        private void OnApplicationPause(bool paused)
        {
            if (paused)
                SaveNow();
        }

        private void OnApplicationQuit() => SaveNow();

        private void BuildInventoryLookup()
        {
            inventory.Clear();
            foreach (InventoryEntry entry in save.inventory)
            {
                if (!string.IsNullOrWhiteSpace(entry.key))
                    inventory[entry.key] = Mathf.Max(0, entry.amount);
            }
        }

        private void FlushInventory()
        {
            save.inventory.Clear();
            foreach ((string key, int amount) in inventory)
                save.inventory.Add(new InventoryEntry { key = key, amount = amount });
        }

        public bool TrySpend(float amount)
        {
            amount = Mathf.Max(0f, amount);
            if (save.coins + 0.001f < amount)
                return false;

            save.coins -= amount;
            NotifyChanged();
            return true;
        }

        public void AddCoins(float amount)
        {
            save.coins = Mathf.Max(0f, save.coins + amount);
            NotifyChanged();
        }

        public int GetInventory(string key) => inventory.TryGetValue(key, out int value) ? value : 0;

        public int UsedStorage
        {
            get
            {
                int total = 0;
                foreach (int amount in inventory.Values)
                    total += Mathf.Max(0, amount);
                return total;
            }
        }

        public bool TryAddInventory(string key, int amount)
        {
            if (amount <= 0)
                return true;

            if (UsedStorage + amount > save.barnCapacity)
                return false;

            inventory[key] = GetInventory(key) + amount;
            NotifyChanged();
            return true;
        }

        public int RemoveInventory(string key, int amount)
        {
            int current = GetInventory(key);
            int removed = Mathf.Clamp(amount, 0, current);
            inventory[key] = current - removed;
            NotifyChanged();
            return removed;
        }

        public void SelectTool(FarmTool tool)
        {
            save.selectedTool = tool;
            NotifyChanged(false);
        }

        public void SelectCrop(CropKind crop)
        {
            save.selectedCrop = crop;
            NotifyChanged(false);
        }

        public void ToggleMode()
        {
            save.mode = save.mode == GameMode.Free ? GameMode.Realistic : GameMode.Free;
            NotifyChanged();
        }

        public float CalculateCropSale(CropKind kind, int units)
        {
            if (units <= 0)
                return 0f;

            CropBalance crop = balance.Crop(kind);
            FarmLevelBalance level = balance.Level(save.level);

            if (save.mode == GameMode.Free)
                return crop.freeSellPrice * level.freeMultiplier * units;

            float margin = Mathf.Clamp(level.realisticMarginCap, 0f, 0.10f);
            return crop.realisticInputCost * (1f + margin) * units;
        }

        public bool TryUpgradeFarm()
        {
            if (save.level >= balance.levels.Length)
                return false;

            FarmLevelBalance next = balance.Level(save.level + 1);
            if (!TrySpend(next.upgradeCost))
                return false;

            save.level++;
            NotifyChanged();
            return true;
        }

        public bool BuyAxe()
        {
            if (save.axeOwned)
                return true;
            if (!TrySpend(balance.axePurchaseCost))
                return false;
            save.axeOwned = true;
            NotifyChanged();
            return true;
        }

        public void AddWood(int amount)
        {
            save.wood = Mathf.Max(0, save.wood + amount);
            NotifyChanged();
        }

        public void SaveNow()
        {
            if (save == null || saveSystem == null)
                return;
            FlushInventory();
            saveSystem.Save(save);
        }

        public void NotifyChanged(bool saveImmediately = true)
        {
            StateChanged?.Invoke();
            if (saveImmediately)
                SaveNow();
        }
    }
}
