using System;
using System.IO;
using UnityEngine;

namespace AgroFarm
{
    [DisallowMultipleComponent]
    public sealed class FarmSaveSystem : MonoBehaviour
    {
        private const string FileName = "agrofarm-save.json";
        private string SavePath => Path.Combine(Application.persistentDataPath, FileName);

        public FarmSaveData LoadOrCreate(FarmBalanceConfig config)
        {
            try
            {
                if (File.Exists(SavePath))
                {
                    string json = File.ReadAllText(SavePath);
                    FarmSaveData loaded = JsonUtility.FromJson<FarmSaveData>(json);
                    if (loaded != null)
                        return loaded;
                }
            }
            catch (Exception exception)
            {
                Debug.LogWarning($"Falha ao carregar save: {exception.Message}");
            }

            return new FarmSaveData
            {
                coins = config.startingCoins,
                barnCapacity = config.startingBarnCapacity,
                lastSavedAtUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
            };
        }

        public void Save(FarmSaveData data)
        {
            if (data == null)
                return;

            try
            {
                data.lastSavedAtUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                string json = JsonUtility.ToJson(data, true);
                string temporary = SavePath + ".tmp";
                File.WriteAllText(temporary, json);

                if (File.Exists(SavePath))
                    File.Delete(SavePath);

                File.Move(temporary, SavePath);
            }
            catch (Exception exception)
            {
                Debug.LogError($"Falha ao salvar AgroFarm: {exception}");
            }
        }

        public void ResetSave()
        {
            if (File.Exists(SavePath))
                File.Delete(SavePath);
        }
    }
}
