using System;
using System.Collections.Generic;
using UnityEngine;

namespace AgroFarm
{
    [Serializable]
    public sealed class InventoryEntry
    {
        public string key;
        public int amount;
    }

    [Serializable]
    public sealed class CropPlotSave
    {
        public string id;
        public Vector3 position;
        public CropState state;
        public CropKind crop;
        public double readyAtUnix;
        public bool watered;
        public bool protectedCrop;
    }

    [Serializable]
    public sealed class PlaceableSave
    {
        public string id;
        public PlaceableKind kind;
        public Vector3 position;
        public Quaternion rotation;
    }

    [Serializable]
    public sealed class AnimalPenSave
    {
        public string id;
        public AnimalKind kind;
        public int animalCount;
        public float care;
        public double readyAtUnix;
    }

    [Serializable]
    public sealed class FarmSaveData
    {
        public int version = 1;
        public float coins = 100f;
        public int level = 1;
        public int barnCapacity = 10;
        public GameMode mode = GameMode.Free;
        public bool axeOwned;
        public int wood;
        public int expansionLevel;
        public FarmTool selectedTool = FarmTool.Hoe;
        public CropKind selectedCrop = CropKind.Corn;
        public double lastSavedAtUnix;
        public List<string> removedTreeIds = new();
        public List<string> hiredEmployees = new();
        public List<InventoryEntry> inventory = new();
        public List<CropPlotSave> cropPlots = new();
        public List<PlaceableSave> placeables = new();
        public List<AnimalPenSave> animalPens = new();
    }
}
