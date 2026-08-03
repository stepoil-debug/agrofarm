using System;
using System.Collections.Generic;
using UnityEngine;

namespace AgroFarm
{
    [DisallowMultipleComponent]
    public sealed class FarmWorldFactory : MonoBehaviour
    {
        public static FarmWorldFactory Instance { get; private set; }

        private readonly Dictionary<string, Material> materials = new(StringComparer.OrdinalIgnoreCase);
        private Transform worldRoot;
        private GameObject ground;
        private FarmExpansionManager expansionManager;

        public void Initialize(FarmExpansionManager expansions)
        {
            Instance = this;
            expansionManager = expansions;
            worldRoot = new GameObject("ProceduralFarmWorld").transform;
            worldRoot.SetParent(transform, false);
            BuildEnvironment();
            BuildInitialFarm();
        }

        public void RefreshGroundSize(Vector3 size)
        {
            if (ground == null)
                return;
            ground.transform.localScale = new Vector3(size.x, 0.5f, size.z);
        }

        private void BuildEnvironment()
        {
            Vector3 size = expansionManager.CurrentBounds.size;
            ground = CreateCube("FarmGround", Vector3.zero, new Vector3(size.x, 0.5f, size.z), Material("grass", new Color(0.30f, 0.62f, 0.18f), 0f, 0.82f), worldRoot);
            ground.transform.position = new Vector3(0f, -0.25f, 0f);

            GameObject water = CreateCube("Water", new Vector3(0f, -0.7f, 0f), new Vector3(size.x + 60f, 0.5f, size.z + 60f), Material("water", new Color(0.18f, 0.58f, 0.78f, 0.8f), 0f, 0.12f), worldRoot);
            Collider waterCollider = water.GetComponent<Collider>();
            if (waterCollider != null) Destroy(waterCollider);

            CreatePath(new Vector3(0f, 0.03f, 0f), new Vector3(4f, 0.08f, 25f));
            CreatePath(new Vector3(0f, 0.04f, 0f), new Vector3(31f, 0.08f, 3.5f));

            BuildLighting();
        }

        private void BuildLighting()
        {
            GameObject lightObject = new("Sun");
            lightObject.transform.SetParent(worldRoot, false);
            lightObject.transform.rotation = Quaternion.Euler(48f, -35f, 0f);
            Light light = lightObject.AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.35f;
            light.color = new Color(1f, 0.93f, 0.78f);
            light.shadows = LightShadows.Soft;

            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.45f, 0.65f, 0.78f);
            RenderSettings.ambientEquatorColor = new Color(0.36f, 0.45f, 0.29f);
            RenderSettings.ambientGroundColor = new Color(0.17f, 0.19f, 0.12f);
            RenderSettings.fog = true;
            RenderSettings.fogColor = new Color(0.62f, 0.78f, 0.82f);
            RenderSettings.fogMode = FogMode.Linear;
            RenderSettings.fogStartDistance = 55f;
            RenderSettings.fogEndDistance = 130f;
        }

        private void BuildInitialFarm()
        {
            CreateBuilding("house", PlaceableKind.FarmHouse, new Vector3(2f, 0f, -9f), new Vector2(7f, 6f), 55f, new Color(0.90f, 0.73f, 0.42f), new Color(0.73f, 0.18f, 0.10f));
            CreateBuilding("barn", PlaceableKind.Barn, new Vector3(13f, 0f, -5.5f), new Vector2(8f, 7f), 40f, new Color(0.65f, 0.12f, 0.08f), new Color(0.22f, 0.26f, 0.28f));
            CreateBuilding("workshop", PlaceableKind.Workshop, new Vector3(-13f, 0f, -6f), new Vector2(6f, 5f), 35f, new Color(0.40f, 0.43f, 0.37f), new Color(0.18f, 0.20f, 0.19f));
            CreateBuilding("market", PlaceableKind.Market, new Vector3(0f, 0f, 10f), new Vector2(6f, 4f), 20f, new Color(0.72f, 0.45f, 0.20f), new Color(0.92f, 0.25f, 0.12f));

            CreateAnimalPen(AnimalKind.Cow, new Vector3(10f, 0f, 3f));
            CreateAnimalPen(AnimalKind.Chicken, new Vector3(11.5f, 0f, 10f));
            CreateAnimalPen(AnimalKind.Pig, new Vector3(-11.5f, 0f, 9f));

            Vector3 start = new(-8.5f, 0f, 1f);
            int index = 0;
            for (int row = 0; row < 3; row++)
            {
                for (int column = 0; column < 4; column++)
                {
                    CreateCropPlot(start + new Vector3(column * 3.2f, 0f, row * 2.6f), $"plot-{index++}");
                }
            }

            Vector3[] trees =
            {
                new(-18f,0f,-10f), new(-13f,0f,-12f), new(-7f,0f,-12f), new(9f,0f,-12f), new(17f,0f,-10f),
                new(-19f,0f,-2f), new(19f,0f,-1f), new(-18f,0f,7f), new(18f,0f,8f), new(-17f,0f,13f),
                new(17f,0f,13f), new(-5f,0f,13f), new(6f,0f,13f)
            };
            for (int treeIndex = 0; treeIndex < trees.Length; treeIndex++)
                CreateTree(trees[treeIndex], $"tree-{treeIndex}");

            CreateExpansionSign(new Vector3(0f, 0f, -16.2f));
            CreateExpansionSign(new Vector3(0f, 0f, 16.2f));
            CreateExpansionSign(new Vector3(-23f, 0f, 0f));
            CreateExpansionSign(new Vector3(23f, 0f, 0f));
        }

        public PlaceableObject CreateBuilding(string id, PlaceableKind kind, Vector3 position, Vector2 footprint, float moveCost, Color wallColor, Color roofColor)
        {
            GameObject root = new(id);
            root.transform.SetParent(worldRoot, false);
            root.transform.position = position;

            FarmBuildingInteraction interaction = root.AddComponent<FarmBuildingInteraction>();
            interaction.Configure(kind);
            PlaceableObject placeable = root.AddComponent<PlaceableObject>();
            placeable.Configure(id, kind, footprint, moveCost, true);

            CreateCube("Foundation", new Vector3(0f, 0.2f, 0f), new Vector3(footprint.x, 0.4f, footprint.y), Material("foundation", new Color(0.48f, 0.36f, 0.22f), 0f, 0.75f), root.transform);
            CreateCube("Walls", new Vector3(0f, 2f, 0f), new Vector3(footprint.x * 0.82f, 3.6f, footprint.y * 0.75f), Material($"wall-{wallColor}", wallColor, 0f, 0.72f), root.transform);
            CreateRoof(root.transform, footprint, roofColor);
            CreateCube("Door", new Vector3(0f, 1.4f, footprint.y * 0.38f), new Vector3(1.35f, 2.6f, 0.18f), Material("door", new Color(0.28f, 0.13f, 0.07f), 0f, 0.65f), root.transform);
            CreateCube("WindowL", new Vector3(-footprint.x * 0.23f, 2.2f, footprint.y * 0.39f), new Vector3(1.1f, 1.1f, 0.12f), Material("glass", new Color(0.35f, 0.72f, 0.84f), 0.1f, 0.08f), root.transform);
            CreateCube("WindowR", new Vector3(footprint.x * 0.23f, 2.2f, footprint.y * 0.39f), new Vector3(1.1f, 1.1f, 0.12f), Material("glass", new Color(0.35f, 0.72f, 0.84f), 0.1f, 0.08f), root.transform);
            return placeable;
        }

        public CropPlot CreateCropPlot(Vector3 position, string id = null)
        {
            id ??= $"plot-{Guid.NewGuid():N}";
            GameObject root = CreateCube(id, position + Vector3.up * 0.12f, new Vector3(2.7f, 0.24f, 2.1f), Material("soil", new Color(0.27f, 0.14f, 0.07f), 0f, 0.92f), worldRoot);
            CropPlot plot = root.AddComponent<CropPlot>();
            PlaceableObject placeable = root.AddComponent<PlaceableObject>();
            placeable.Configure(id, PlaceableKind.CropPlot, new Vector2(2.8f, 2.2f), 12f, true);
            plot.Configure(id);
            return plot;
        }

        public PlaceableObject CreateFence(Vector3 position)
        {
            string id = $"fence-{Guid.NewGuid():N}";
            GameObject root = new(id);
            root.transform.SetParent(worldRoot, false);
            root.transform.position = position;
            PlaceableObject placeable = root.AddComponent<PlaceableObject>();
            placeable.Configure(id, PlaceableKind.Fence, new Vector2(2.2f, 0.35f), 2f, true);
            CreateFenceSegment(root.transform, Vector3.zero, 2.2f);
            return placeable;
        }

        public AnimalPen CreateAnimalPen(AnimalKind kind, Vector3 position)
        {
            string id = kind switch
            {
                AnimalKind.Cow => "cow-pasture",
                AnimalKind.Chicken => "chicken-coop",
                AnimalKind.Pig => "pig-pen",
                AnimalKind.Fish => "fish-pond",
                _ => $"pen-{Guid.NewGuid():N}"
            };

            GameObject root = new(id);
            root.transform.SetParent(worldRoot, false);
            root.transform.position = position;
            AnimalPen pen = root.AddComponent<AnimalPen>();
            PlaceableKind placeableKind = kind switch
            {
                AnimalKind.Cow => PlaceableKind.CowPasture,
                AnimalKind.Chicken => PlaceableKind.ChickenCoop,
                AnimalKind.Pig => PlaceableKind.PigPen,
                AnimalKind.Fish => PlaceableKind.FishPond,
                _ => PlaceableKind.Decoration
            };
            PlaceableObject placeable = root.AddComponent<PlaceableObject>();
            Vector2 footprint = kind == AnimalKind.Cow ? new Vector2(10f, 8f) : new Vector2(7f, 6f);
            placeable.Configure(id, placeableKind, footprint, kind == AnimalKind.Fish ? 30f : 25f, true);

            if (kind == AnimalKind.Fish)
            {
                GameObject pond = CreateCylinder("Pond", new Vector3(0f, 0.08f, 0f), new Vector3(5.2f, 0.16f, 4.2f), Material("pond", new Color(0.18f, 0.63f, 0.78f), 0f, 0.08f), root.transform);
                Collider collider = pond.GetComponent<Collider>();
                if (collider != null) collider.isTrigger = false;
            }
            else
            {
                BuildFenceRectangle(root.transform, footprint);
                if (kind != AnimalKind.Cow)
                    CreateCube("Shelter", new Vector3(-1.5f, 1.2f, -1.4f), new Vector3(3f, 2.4f, 2.5f), Material("shelter", new Color(0.64f, 0.39f, 0.17f), 0f, 0.78f), root.transform);
            }

            pen.Configure(id, kind);
            return pen;
        }

        private void CreateTree(Vector3 position, string id)
        {
            GameObject root = new(id);
            root.transform.SetParent(worldRoot, false);
            root.transform.position = position;
            CreateCylinder("Trunk", new Vector3(0f, 1.5f, 0f), new Vector3(0.55f, 3f, 0.55f), Material("bark", new Color(0.30f, 0.16f, 0.07f), 0f, 0.88f), root.transform);
            CreateSphere("CanopyA", new Vector3(0f, 3.6f, 0f), new Vector3(2.1f, 1.8f, 2.1f), Material("leaves", new Color(0.20f, 0.56f, 0.13f), 0f, 0.82f), root.transform);
            CreateSphere("CanopyB", new Vector3(0.9f, 3.4f, 0.3f), new Vector3(1.4f, 1.3f, 1.4f), Material("leaves-light", new Color(0.28f, 0.68f, 0.18f), 0f, 0.8f), root.transform);
            TreeResource tree = root.AddComponent<TreeResource>();
            tree.Configure(id, FarmSession.Instance.Balance.woodPerTree, FarmSession.Instance.Balance.treeRemovalCost);
        }

        private void CreateExpansionSign(Vector3 position)
        {
            GameObject root = new("ExpansionSign");
            root.transform.SetParent(worldRoot, false);
            root.transform.position = position;
            CreateCube("Post", new Vector3(0f, 0.9f, 0f), new Vector3(0.18f, 1.8f, 0.18f), Material("wood", new Color(0.38f, 0.20f, 0.08f), 0f, 0.85f), root.transform);
            CreateCube("Board", new Vector3(0f, 1.65f, 0f), new Vector3(2.6f, 0.8f, 0.18f), Material("sign", new Color(0.72f, 0.48f, 0.20f), 0f, 0.72f), root.transform);
            ExpansionZone zone = root.AddComponent<ExpansionZone>();
            zone.Configure(expansionManager);
        }

        private void CreatePath(Vector3 position, Vector3 size)
        {
            GameObject path = CreateCube("Path", position, size, Material("path", new Color(0.68f, 0.48f, 0.25f), 0f, 0.92f), worldRoot);
            Collider collider = path.GetComponent<Collider>();
            if (collider != null) Destroy(collider);
        }

        private void CreateRoof(Transform parent, Vector2 footprint, Color color)
        {
            Material material = Material($"roof-{color}", color, 0f, 0.74f);
            GameObject left = CreateCube("RoofLeft", new Vector3(-footprint.x * 0.2f, 4.25f, 0f), new Vector3(footprint.x * 0.58f, 0.32f, footprint.y * 0.92f), material, parent);
            left.transform.localRotation = Quaternion.Euler(0f, 0f, 24f);
            GameObject right = CreateCube("RoofRight", new Vector3(footprint.x * 0.2f, 4.25f, 0f), new Vector3(footprint.x * 0.58f, 0.32f, footprint.y * 0.92f), material, parent);
            right.transform.localRotation = Quaternion.Euler(0f, 0f, -24f);
        }

        private void BuildFenceRectangle(Transform parent, Vector2 size)
        {
            float halfX = size.x * 0.5f;
            float halfZ = size.y * 0.5f;
            for (float x = -halfX; x <= halfX + 0.01f; x += 2f)
            {
                CreateFencePost(parent, new Vector3(x, 0f, -halfZ));
                CreateFencePost(parent, new Vector3(x, 0f, halfZ));
            }
            for (float z = -halfZ; z <= halfZ + 0.01f; z += 2f)
            {
                CreateFencePost(parent, new Vector3(-halfX, 0f, z));
                CreateFencePost(parent, new Vector3(halfX, 0f, z));
            }
            for (float x = -halfX + 1f; x < halfX; x += 2f)
            {
                CreateFenceRail(parent, new Vector3(x, 0f, -halfZ), false);
                CreateFenceRail(parent, new Vector3(x, 0f, halfZ), false);
            }
            for (float z = -halfZ + 1f; z < halfZ; z += 2f)
            {
                CreateFenceRail(parent, new Vector3(-halfX, 0f, z), true);
                CreateFenceRail(parent, new Vector3(halfX, 0f, z), true);
            }
        }

        private void CreateFenceSegment(Transform parent, Vector3 position, float length)
        {
            CreateFencePost(parent, position + Vector3.left * length * 0.5f);
            CreateFencePost(parent, position + Vector3.right * length * 0.5f);
            CreateCube("RailLow", position + Vector3.up * 0.55f, new Vector3(length, 0.12f, 0.12f), Material("fence", new Color(0.55f, 0.33f, 0.13f), 0f, 0.82f), parent);
            CreateCube("RailHigh", position + Vector3.up * 1.05f, new Vector3(length, 0.12f, 0.12f), Material("fence", new Color(0.55f, 0.33f, 0.13f), 0f, 0.82f), parent);
        }

        private void CreateFencePost(Transform parent, Vector3 position)
        {
            CreateCylinder("FencePost", position + Vector3.up * 0.7f, new Vector3(0.16f, 1.4f, 0.16f), Material("fence", new Color(0.55f, 0.33f, 0.13f), 0f, 0.82f), parent);
        }

        private void CreateFenceRail(Transform parent, Vector3 position, bool vertical)
        {
            Vector3 size = vertical ? new Vector3(0.12f, 0.12f, 2f) : new Vector3(2f, 0.12f, 0.12f);
            CreateCube("RailLow", position + Vector3.up * 0.55f, size, Material("fence", new Color(0.55f, 0.33f, 0.13f), 0f, 0.82f), parent);
            CreateCube("RailHigh", position + Vector3.up * 1.05f, size, Material("fence", new Color(0.55f, 0.33f, 0.13f), 0f, 0.82f), parent);
        }

        private Material Material(string key, Color color, float metallic, float roughness)
        {
            if (materials.TryGetValue(key, out Material cached))
                return cached;
            Shader shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            Material material = new(shader) { name = $"PBR_{key}" };
            if (material.HasProperty("_BaseColor")) material.SetColor("_BaseColor", color);
            else material.color = color;
            if (material.HasProperty("_Metallic")) material.SetFloat("_Metallic", metallic);
            if (material.HasProperty("_Smoothness")) material.SetFloat("_Smoothness", 1f - roughness);
            material.enableInstancing = true;
            materials[key] = material;
            return material;
        }

        private static GameObject CreateCube(string name, Vector3 position, Vector3 scale, Material material, Transform parent)
        {
            GameObject value = GameObject.CreatePrimitive(PrimitiveType.Cube);
            value.name = name;
            value.transform.SetParent(parent, false);
            value.transform.localPosition = position;
            value.transform.localScale = scale;
            value.GetComponent<Renderer>().sharedMaterial = material;
            return value;
        }

        private static GameObject CreateSphere(string name, Vector3 position, Vector3 scale, Material material, Transform parent)
        {
            GameObject value = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            value.name = name;
            value.transform.SetParent(parent, false);
            value.transform.localPosition = position;
            value.transform.localScale = scale;
            value.GetComponent<Renderer>().sharedMaterial = material;
            return value;
        }

        private static GameObject CreateCylinder(string name, Vector3 position, Vector3 scale, Material material, Transform parent)
        {
            GameObject value = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            value.name = name;
            value.transform.SetParent(parent, false);
            value.transform.localPosition = position;
            value.transform.localScale = scale;
            value.GetComponent<Renderer>().sharedMaterial = material;
            return value;
        }
    }
}
