using System;
using UnityEngine;

namespace AgroFarm
{
    [DisallowMultipleComponent]
    public sealed class PlaceableObject : MonoBehaviour, IFarmInteractable
    {
        [SerializeField] private string persistentId;
        [SerializeField] private PlaceableKind kind = PlaceableKind.Decoration;
        [SerializeField] private Vector2 footprint = new(3f, 3f);
        [SerializeField, Min(0f)] private float moveCost = 20f;
        [SerializeField] private bool movable = true;
        [SerializeField] private Vector3 approachOffset = new(0f, 0f, 2.5f);

        public string PersistentId => persistentId;
        public PlaceableKind Kind => kind;
        public Vector2 Footprint => footprint;
        public float MoveCost => moveCost;
        public bool Movable => movable;
        public Transform InteractionTransform => transform;

        public void Configure(string id, PlaceableKind valueKind, Vector2 valueFootprint, float valueMoveCost, bool canMove = true)
        {
            persistentId = id;
            kind = valueKind;
            footprint = valueFootprint;
            moveCost = valueMoveCost;
            movable = canMove;
        }

        private void Awake()
        {
            if (string.IsNullOrWhiteSpace(persistentId))
                persistentId = $"{kind}-{Guid.NewGuid():N}";
        }

        public Vector3 GetApproachPoint(Vector3 actorPosition)
        {
            Vector3 offset = transform.TransformDirection(approachOffset);
            return transform.position + offset;
        }

        public void Interact(FarmSession session)
        {
            FarmHUD.Instance?.ShowMessage($"{GetDisplayName()} selecionado. Use Editar para reposicionar.");
        }

        public Bounds GetPlacementBounds(Vector3 position)
        {
            return new Bounds(position + Vector3.up, new Vector3(footprint.x, 2f, footprint.y));
        }

        public PlaceableSave Capture()
        {
            return new PlaceableSave
            {
                id = persistentId,
                kind = kind,
                position = transform.position,
                rotation = transform.rotation
            };
        }

        private string GetDisplayName()
        {
            return kind switch
            {
                PlaceableKind.FarmHouse => "Casa da fazenda",
                PlaceableKind.Barn => "Celeiro",
                PlaceableKind.Workshop => "Oficina",
                PlaceableKind.Market => "Mercado rural",
                PlaceableKind.CowPasture => "Pasto bovino",
                PlaceableKind.ChickenCoop => "Galinheiro",
                PlaceableKind.PigPen => "Chiqueiro",
                PlaceableKind.FishPond => "Lago de peixes",
                PlaceableKind.CropPlot => "Canteiro",
                PlaceableKind.Fence => "Cerca",
                _ => "Elemento"
            };
        }
    }
}
