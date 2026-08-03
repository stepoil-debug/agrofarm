using System.Collections.Generic;
using UnityEngine;

namespace AgroFarm
{
    public static class FarmSavedWorldRestorer
    {
        public static void Restore(FarmWorldFactory factory, FarmSaveData save)
        {
            if (factory == null || save == null)
                return;

            HashSet<string> existingIds = new();
            PlaceableObject[] existing = Object.FindObjectsByType<PlaceableObject>(FindObjectsSortMode.None);
            foreach (PlaceableObject placeable in existing)
                existingIds.Add(placeable.PersistentId);

            foreach (PlaceableSave item in save.placeables)
            {
                if (existingIds.Contains(item.id))
                    continue;

                switch (item.kind)
                {
                    case PlaceableKind.Fence:
                    {
                        PlaceableObject fence = factory.CreateFence(item.position);
                        fence.Configure(item.id, PlaceableKind.Fence, new Vector2(2.2f, 0.35f), 2f, true);
                        fence.transform.rotation = item.rotation;
                        existingIds.Add(item.id);
                        break;
                    }
                    case PlaceableKind.CropPlot:
                    {
                        CropPlot plot = factory.CreateCropPlot(item.position, item.id);
                        plot.transform.rotation = item.rotation;
                        existingIds.Add(item.id);
                        break;
                    }
                    case PlaceableKind.FishPond:
                    {
                        AnimalPen pond = factory.CreateAnimalPen(AnimalKind.Fish, item.position);
                        pond.transform.rotation = item.rotation;
                        existingIds.Add(item.id);
                        break;
                    }
                }
            }
        }
    }
}
