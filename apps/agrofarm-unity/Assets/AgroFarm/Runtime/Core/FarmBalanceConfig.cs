using System;
using System.Collections.Generic;
using UnityEngine;

namespace AgroFarm
{
    [CreateAssetMenu(menuName = "AgroFarm/Farm Balance", fileName = "FarmBalance")]
    public sealed class FarmBalanceConfig : ScriptableObject
    {
        public float startingCoins = 100f;
        public int startingBarnCapacity = 10;
        public float axePurchaseCost = 120f;
        public float treeRemovalCost = 10f;
        public int woodPerTree = 3;
        public float fenceCost = 4f;
        public float fishPondCost = 220f;
        public float[] expansionCosts = { 120f, 250f, 500f, 900f };

        public CropBalance[] crops =
        {
            new CropBalance
            {
                kind = CropKind.Corn,
                displayName = "Milho",
                seedCost = 4f,
                freeSellPrice = 7f,
                realisticInputCost = 4f,
                freeDurationSeconds = 34f,
                realisticDurationSeconds = 7200f
            },
            new CropBalance
            {
                kind = CropKind.Cassava,
                displayName = "Mandioca",
                seedCost = 8f,
                freeSellPrice = 14f,
                realisticInputCost = 8f,
                freeDurationSeconds = 46f,
                realisticDurationSeconds = 14400f
            },
            new CropBalance
            {
                kind = CropKind.Pineapple,
                displayName = "Abacaxi",
                seedCost = 15f,
                freeSellPrice = 26f,
                realisticInputCost = 15f,
                freeDurationSeconds = 64f,
                realisticDurationSeconds = 21600f
            }
        };

        public FarmLevelBalance[] levels =
        {
            new FarmLevelBalance { level = 1, upgradeCost = 0f, realisticMarginCap = 0.02f, freeMultiplier = 1f },
            new FarmLevelBalance { level = 2, upgradeCost = 150f, realisticMarginCap = 0.04f, freeMultiplier = 1.2f },
            new FarmLevelBalance { level = 3, upgradeCost = 300f, realisticMarginCap = 0.06f, freeMultiplier = 1.4f },
            new FarmLevelBalance { level = 4, upgradeCost = 600f, realisticMarginCap = 0.08f, freeMultiplier = 1.65f },
            new FarmLevelBalance { level = 5, upgradeCost = 1000f, realisticMarginCap = 0.10f, freeMultiplier = 1.95f }
        };

        public AnimalBalance[] animals =
        {
            new AnimalBalance
            {
                kind = AnimalKind.Cow,
                displayName = "Vaca leiteira",
                purchaseCost = 260f,
                feedCost = 5f,
                initialCapacity = 4,
                freeCycleSeconds = 80f,
                realisticCycleSeconds = 18000f,
                freeProductValue = 4f,
                realisticProductValue = 2f
            },
            new AnimalBalance
            {
                kind = AnimalKind.Chicken,
                displayName = "Galinha poedeira",
                purchaseCost = 40f,
                feedCost = 1f,
                initialCapacity = 6,
                freeCycleSeconds = 55f,
                realisticCycleSeconds = 10800f,
                freeProductValue = 2.2f,
                realisticProductValue = 1.1f
            },
            new AnimalBalance
            {
                kind = AnimalKind.Pig,
                displayName = "Porco",
                purchaseCost = 120f,
                feedCost = 3f,
                initialCapacity = 4,
                freeCycleSeconds = 150f,
                realisticCycleSeconds = 28800f,
                freeProductValue = 25f,
                realisticProductValue = 12f
            },
            new AnimalBalance
            {
                kind = AnimalKind.Fish,
                displayName = "Tilápia",
                purchaseCost = 12f,
                feedCost = 2f,
                initialCapacity = 12,
                freeCycleSeconds = 180f,
                realisticCycleSeconds = 36000f,
                freeProductValue = 7f,
                realisticProductValue = 3.6f
            }
        };

        public EmployeeBalance[] employees =
        {
            new EmployeeBalance { kind = EmployeeKind.Harvester, displayName = "Colhedor", hireCost = 120f, wagePerDay = 18f },
            new EmployeeBalance { kind = EmployeeKind.Seller, displayName = "Vendedor", hireCost = 140f, wagePerDay = 22f },
            new EmployeeBalance { kind = EmployeeKind.Caretaker, displayName = "Tratador", hireCost = 160f, wagePerDay = 24f }
        };

        private readonly Dictionary<CropKind, CropBalance> cropLookup = new();
        private readonly Dictionary<AnimalKind, AnimalBalance> animalLookup = new();
        private readonly Dictionary<EmployeeKind, EmployeeBalance> employeeLookup = new();

        public void BuildLookups()
        {
            cropLookup.Clear();
            animalLookup.Clear();
            employeeLookup.Clear();

            foreach (CropBalance crop in crops)
                cropLookup[crop.kind] = crop;

            foreach (AnimalBalance animal in animals)
                animalLookup[animal.kind] = animal;

            foreach (EmployeeBalance employee in employees)
                employeeLookup[employee.kind] = employee;
        }

        public CropBalance Crop(CropKind kind)
        {
            if (cropLookup.Count == 0)
                BuildLookups();
            return cropLookup[kind];
        }

        public AnimalBalance Animal(AnimalKind kind)
        {
            if (animalLookup.Count == 0)
                BuildLookups();
            return animalLookup[kind];
        }

        public EmployeeBalance Employee(EmployeeKind kind)
        {
            if (employeeLookup.Count == 0)
                BuildLookups();
            return employeeLookup[kind];
        }

        public FarmLevelBalance Level(int level)
        {
            int index = Mathf.Clamp(level - 1, 0, levels.Length - 1);
            return levels[index];
        }

        public static FarmBalanceConfig CreateRuntimeDefault()
        {
            FarmBalanceConfig config = CreateInstance<FarmBalanceConfig>();
            config.name = "RuntimeFarmBalance";
            config.BuildLookups();
            return config;
        }
    }
}
