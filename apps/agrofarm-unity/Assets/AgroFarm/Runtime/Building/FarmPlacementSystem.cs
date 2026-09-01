using System;
using System.Collections.Generic;
using UnityEngine;

namespace AgroFarm
{
    public enum PlacementAction
    {
        None,
        Move,
        PlaceFence,
        PlacePlot,
        PlacePond,
        CutTree
    }

    [DisallowMultipleComponent]
    public sealed class FarmPlacementSystem : MonoBehaviour
    {
        [SerializeField] private LayerMask blockingMask = ~0;
        [SerializeField, Min(0.1f)] private float gridSize = 1f;
        [SerializeField] private Material validGhostMaterial;
        [SerializeField] private Material invalidGhostMaterial;

        private readonly Dictionary<string, PlaceableObject> placeables = new(StringComparer.OrdinalIgnoreCase);
        private PlaceableObject selected;
        private PlacementAction action;
        private FarmWorldFactory worldFactory;
        private FarmExpansionManager expansionManager;

        public bool IsEditing { get; private set; }
        public PlacementAction Action => action;

        public void Configure(FarmWorldFactory factory, FarmExpansionManager expansions)
        {
            worldFactory = factory;
            expansionManager = expansions;
            RebuildRegistry();
            RestoreSavedPositions();
        }

        public void RebuildRegistry()
        {
            placeables.Clear();
            PlaceableObject[] found = FindObjectsByType<PlaceableObject>(FindObjectsSortMode.None);
            foreach (PlaceableObject placeable in found)
                placeables[placeable.PersistentId] = placeable;
        }

        public void SetEditing(bool enabled)
        {
            IsEditing = enabled;
            if (!enabled)
            {
                action = PlacementAction.None;
                selected = null;
            }
            FarmHUD.Instance?.Refresh();
        }

        public void SetAction(PlacementAction next)
        {
            IsEditing = true;
            action = next;
            selected = null;
            FarmHUD.Instance?.ShowMessage(ActionInstruction(next));
            FarmHUD.Instance?.Refresh();
        }

        public void HandleWorldPointer(RaycastHit hit)
        {
            switch (action)
            {
                case PlacementAction.Move:
                    HandleMove(hit);
                    break;
                case PlacementAction.CutTree:
                    HandleTree(hit.collider.GetComponentInParent<TreeResource>());
                    break;
                case PlacementAction.PlaceFence:
                    PlaceFence(hit.point);
                    break;
                case PlacementAction.PlacePlot:
                    PlacePlot(hit.point);
                    break;
                case PlacementAction.PlacePond:
                    PlacePond(hit.point);
                    break;
                default:
                    FarmHUD.Instance?.ShowMessage("Escolha Mover, Cerca, Canteiro, Lago ou Machado.");
                    break;
            }
        }

        private void HandleMove(RaycastHit hit)
        {
            if (selected == null)
            {
                PlaceableObject candidate = hit.collider.GetComponentInParent<PlaceableObject>();
                if (candidate == null)
                {
                    FarmHUD.Instance?.ShowMessage("Selecione uma construção, canteiro ou cerca.");
                    return;
                }
                if (!candidate.Movable)
                {
                    FarmHUD.Instance?.ShowMessage("Este elemento não pode ser movido.");
                    return;
                }

                selected = candidate;
                FarmHUD.Instance?.ShowMessage($"Selecionado. Toque no novo local. Custo: {candidate.MoveCost:0} moedas.");
                return;
            }

            Vector3 target = Snap(hit.point);
            if (!CanPlace(selected, target))
            {
                FarmHUD.Instance?.ShowMessage("Local inválido ou ainda não comprado.");
                return;
            }

            FarmSession session = FarmSession.Instance;
            if (session == null || !session.TrySpend(selected.MoveCost))
            {
                FarmHUD.Instance?.ShowMessage("Saldo insuficiente para mover.");
                return;
            }

            selected.transform.position = target;
            SavePlaceables();
            FarmHUD.Instance?.ShowMessage("Elemento reposicionado e salvo.");
            selected = null;
        }

        private bool CanPlace(PlaceableObject placeable, Vector3 position)
        {
            if (expansionManager != null && !expansionManager.Contains(position, placeable.Footprint))
                return false;

            Bounds bounds = placeable.GetPlacementBounds(position);
            Collider[] overlaps = Physics.OverlapBox(bounds.center, bounds.extents * 0.92f, placeable.transform.rotation, blockingMask, QueryTriggerInteraction.Ignore);
            foreach (Collider overlap in overlaps)
            {
                if (overlap == null || overlap.transform.IsChildOf(placeable.transform))
                    continue;
                if (overlap.GetComponentInParent<PlaceableObject>() != null || overlap.GetComponentInParent<TreeResource>() != null)
                    return false;
            }
            return true;
        }

        private void HandleTree(TreeResource tree)
        {
            if (tree == null)
            {
                FarmHUD.Instance?.ShowMessage("Selecione uma árvore.");
                return;
            }
            tree.TryCut();
        }

        private void PlaceFence(Vector3 point)
        {
            FarmSession session = FarmSession.Instance;
            if (session == null || !session.TrySpend(session.Balance.fenceCost))
            {
                FarmHUD.Instance?.ShowMessage("Saldo insuficiente para construir cerca.");
                return;
            }

            PlaceableObject fence = worldFactory.CreateFence(Snap(point));
            placeables[fence.PersistentId] = fence;
            SavePlaceables();
            FarmHUD.Instance?.ShowMessage("Cerca construída.");
        }

        private void PlacePlot(Vector3 point)
        {
            FarmSession session = FarmSession.Instance;
            float cost = 60f + Mathf.Max(0, CountKind(PlaceableKind.CropPlot) - 12) * 25f;
            if (session == null || !session.TrySpend(cost))
            {
                FarmHUD.Instance?.ShowMessage($"O novo canteiro custa {cost:0} moedas.");
                return;
            }

            CropPlot plot = worldFactory.CreateCropPlot(Snap(point));
            PlaceableObject placeable = plot.GetComponent<PlaceableObject>();
            placeables[placeable.PersistentId] = placeable;
            SavePlaceables();
            FarmHUD.Instance?.ShowMessage("Novo canteiro criado.");
        }

        private void PlacePond(Vector3 point)
        {
            if (CountKind(PlaceableKind.FishPond) > 0)
            {
                FarmHUD.Instance?.ShowMessage("Já existe um lago. Ele pode ser movido no editor.");
                return;
            }

            FarmSession session = FarmSession.Instance;
            if (session == null || !session.TrySpend(session.Balance.fishPondCost))
            {
                FarmHUD.Instance?.ShowMessage("Saldo insuficiente para construir o lago.");
                return;
            }

            AnimalPen pond = worldFactory.CreateAnimalPen(AnimalKind.Fish, Snap(point));
            PlaceableObject placeable = pond.GetComponent<PlaceableObject>();
            placeables[placeable.PersistentId] = placeable;
            SavePlaceables();
            FarmHUD.Instance?.ShowMessage("Lago de peixes construído.");
        }

        public void SavePlaceables()
        {
            FarmSession session = FarmSession.Instance;
            if (session == null)
                return;

            session.Save.placeables.Clear();
            foreach (PlaceableObject placeable in placeables.Values)
            {
                if (placeable != null)
                    session.Save.placeables.Add(placeable.Capture());
            }
            session.NotifyChanged();
        }

        private void RestoreSavedPositions()
        {
            FarmSession session = FarmSession.Instance;
            if (session == null)
                return;

            foreach (PlaceableSave saved in session.Save.placeables)
            {
                if (!placeables.TryGetValue(saved.id, out PlaceableObject placeable) || placeable == null)
                    continue;
                placeable.transform.SetPositionAndRotation(saved.position, saved.rotation);
            }
        }

        private int CountKind(PlaceableKind kind)
        {
            int count = 0;
            foreach (PlaceableObject placeable in placeables.Values)
            {
                if (placeable != null && placeable.Kind == kind)
                    count++;
            }
            return count;
        }

        private Vector3 Snap(Vector3 point)
        {
            return new Vector3(
                Mathf.Round(point.x / gridSize) * gridSize,
                0f,
                Mathf.Round(point.z / gridSize) * gridSize);
        }

        private static string ActionInstruction(PlacementAction value)
        {
            return value switch
            {
                PlacementAction.Move => "Selecione um elemento e depois o novo local.",
                PlacementAction.PlaceFence => "Toque no terreno para construir uma cerca.",
                PlacementAction.PlacePlot => "Toque em uma área livre para criar um canteiro.",
                PlacementAction.PlacePond => "Toque em uma área livre para construir o lago.",
                PlacementAction.CutTree => "Selecione uma árvore. É necessário comprar o machado.",
                _ => "Modo de edição ativo."
            };
        }
    }
}
