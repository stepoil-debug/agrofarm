using System;
using UnityEngine;

namespace AgroFarm
{
    public enum GameMode
    {
        Free,
        Realistic
    }

    public enum FarmTool
    {
        Hoe,
        Seed,
        Water,
        Protect,
        Harvest,
        Axe,
        Move,
        Fence,
        Demolish
    }

    public enum CropKind
    {
        Corn,
        Cassava,
        Pineapple
    }

    public enum CropState
    {
        Empty,
        Prepared,
        Growing,
        Ready,
        Lost
    }

    public enum AnimalKind
    {
        Cow,
        Chicken,
        Pig,
        Fish
    }

    public enum EmployeeKind
    {
        Harvester,
        Seller,
        Caretaker
    }

    public enum PlaceableKind
    {
        FarmHouse,
        Barn,
        Workshop,
        Market,
        CowPasture,
        ChickenCoop,
        PigPen,
        FishPond,
        CropPlot,
        Fence,
        Decoration
    }

    [Serializable]
    public sealed class CropBalance
    {
        public CropKind kind;
        public string displayName;
        public float seedCost;
        public float freeSellPrice;
        public float realisticInputCost;
        public float freeDurationSeconds;
        public float realisticDurationSeconds;

        public float GetDuration(GameMode mode) =>
            mode == GameMode.Free ? freeDurationSeconds : realisticDurationSeconds;
    }

    [Serializable]
    public sealed class FarmLevelBalance
    {
        public int level;
        public float upgradeCost;
        [Range(0f, 0.1f)] public float realisticMarginCap;
        public float freeMultiplier;
    }

    [Serializable]
    public sealed class AnimalBalance
    {
        public AnimalKind kind;
        public string displayName;
        public float purchaseCost;
        public float feedCost;
        public int initialCapacity;
        public float freeCycleSeconds;
        public float realisticCycleSeconds;
        public float freeProductValue;
        public float realisticProductValue;
    }

    [Serializable]
    public sealed class EmployeeBalance
    {
        public EmployeeKind kind;
        public string displayName;
        public float hireCost;
        public float wagePerDay;
    }
}
