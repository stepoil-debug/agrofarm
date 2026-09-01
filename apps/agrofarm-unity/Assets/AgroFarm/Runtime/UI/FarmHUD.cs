using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace AgroFarm
{
    [DisallowMultipleComponent]
    public sealed class FarmHUD : MonoBehaviour
    {
        public static FarmHUD Instance { get; private set; }

        private FarmSession session;
        private FarmPlacementSystem placement;
        private FarmExpansionManager expansions;
        private EmployeeManager employees;
        private IsometricCameraRig cameraRig;
        private Canvas canvas;
        private Font font;
        private Text coinsText;
        private Text levelText;
        private Text storageText;
        private Text modeText;
        private Text messageText;
        private Text editText;
        private GameObject editorPanel;
        private GameObject modal;
        private RectTransform modalContent;
        private readonly Dictionary<FarmTool, Button> toolButtons = new();
        private readonly Dictionary<CropKind, Button> cropButtons = new();
        private float messageUntil;

        private static readonly Color PanelColor = new(0.98f, 0.96f, 0.86f, 0.96f);
        private static readonly Color AccentColor = new(0.82f, 0.92f, 0.36f, 1f);
        private static readonly Color DarkText = new(0.16f, 0.22f, 0.13f, 1f);

        public void Configure(FarmSession farmSession, FarmPlacementSystem placementSystem, FarmExpansionManager expansionManager, EmployeeManager employeeManager, IsometricCameraRig rig)
        {
            Instance = this;
            session = farmSession;
            placement = placementSystem;
            expansions = expansionManager;
            employees = employeeManager;
            cameraRig = rig;
            font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf") ?? Font.CreateDynamicFontFromOSFont("Arial", 16);
            BuildCanvas();
            session.StateChanged += Refresh;
            Refresh();
            ShowMessage("AgroFarm Unity: clique ou toque para caminhar e interagir.");
        }

        private void OnDestroy()
        {
            if (session != null)
                session.StateChanged -= Refresh;
        }

        private void Update()
        {
            if (messageText != null && Time.unscaledTime > messageUntil)
                messageText.gameObject.SetActive(false);
        }

        private void BuildCanvas()
        {
            GameObject canvasObject = new("AgroFarmHUD");
            canvasObject.transform.SetParent(transform, false);
            canvas = canvasObject.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 100;
            CanvasScaler scaler = canvasObject.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.matchWidthOrHeight = 0.5f;
            canvasObject.AddComponent<GraphicRaycaster>();

            BuildTopBar(canvas.transform);
            BuildCropPicker(canvas.transform);
            BuildToolBar(canvas.transform);
            BuildActionMenu(canvas.transform);
            BuildZoomControls(canvas.transform);
            BuildMessage(canvas.transform);
            BuildEditorPanel(canvas.transform);
            BuildModal(canvas.transform);
        }

        private void BuildTopBar(Transform parent)
        {
            RectTransform panel = Panel("TopBar", parent, new Vector2(0.5f, 1f), new Vector2(0.5f, 1f), new Vector2(-360f, -78f), new Vector2(360f, -18f));
            HorizontalLayoutGroup row = panel.gameObject.AddComponent<HorizontalLayoutGroup>();
            row.padding = new RectOffset(16, 16, 8, 8);
            row.spacing = 8f;
            row.childAlignment = TextAnchor.MiddleCenter;
            row.childForceExpandHeight = true;
            row.childForceExpandWidth = false;
            AddText(panel, "AgroFarm", 22, FontStyle.Bold, new Vector2(132f, 44f));
            coinsText = Chip(panel, "100.00", 110f);
            levelText = Chip(panel, "LV 1", 78f);
            storageText = Chip(panel, "0/10", 86f);
            modeText = Button(panel, "Livre", ToggleMode, 105f).GetComponentInChildren<Text>();
            Button(panel, "Menu", OpenMainMenu, 92f);
        }

        private void BuildCropPicker(Transform parent)
        {
            RectTransform panel = Panel("CropPicker", parent, new Vector2(1f, 1f), new Vector2(1f, 1f), new Vector2(-430f, -78f), new Vector2(-18f, -18f));
            HorizontalLayoutGroup row = panel.gameObject.AddComponent<HorizontalLayoutGroup>();
            row.padding = new RectOffset(10, 10, 8, 8);
            row.spacing = 6f;
            row.childAlignment = TextAnchor.MiddleCenter;
            foreach (CropKind crop in Enum.GetValues(typeof(CropKind)))
            {
                string label = session.Balance.Crop(crop).displayName;
                cropButtons[crop] = Button(panel, label, () => session.SelectCrop(crop), 125f);
            }
        }

        private void BuildToolBar(Transform parent)
        {
            RectTransform panel = Panel("ToolBar", parent, new Vector2(0.5f, 0f), new Vector2(0.5f, 0f), new Vector2(-360f, 18f), new Vector2(360f, 94f));
            HorizontalLayoutGroup row = panel.gameObject.AddComponent<HorizontalLayoutGroup>();
            row.padding = new RectOffset(10, 10, 8, 8);
            row.spacing = 6f;
            row.childAlignment = TextAnchor.MiddleCenter;
            AddTool(panel, FarmTool.Hoe, "Enxada");
            AddTool(panel, FarmTool.Seed, "Plantar");
            AddTool(panel, FarmTool.Water, "Regar");
            AddTool(panel, FarmTool.Protect, "Defensivo");
            AddTool(panel, FarmTool.Harvest, "Colher");
        }

        private void AddTool(Transform parent, FarmTool tool, string label)
        {
            toolButtons[tool] = Button(parent, label, () => session.SelectTool(tool), 132f, 54f);
        }

        private void BuildActionMenu(Transform parent)
        {
            RectTransform panel = Panel("Actions", parent, new Vector2(0f, 0f), new Vector2(0f, 0f), new Vector2(18f, 22f), new Vector2(175f, 225f));
            VerticalLayoutGroup column = panel.gameObject.AddComponent<VerticalLayoutGroup>();
            column.padding = new RectOffset(8, 8, 8, 8);
            column.spacing = 6f;
            column.childAlignment = TextAnchor.MiddleCenter;
            Button(panel, "Construir", OpenBuildMenu, 140f, 48f);
            Button(panel, "Equipe", OpenTeamMenu, 140f, 48f);
            Button edit = Button(panel, "Editar mapa", ToggleEditor, 140f, 48f);
            editText = edit.GetComponentInChildren<Text>();
        }

        private void BuildZoomControls(Transform parent)
        {
            RectTransform panel = Panel("Zoom", parent, new Vector2(1f, 0f), new Vector2(1f, 0f), new Vector2(-82f, 22f), new Vector2(-18f, 220f));
            VerticalLayoutGroup column = panel.gameObject.AddComponent<VerticalLayoutGroup>();
            column.padding = new RectOffset(7, 7, 7, 7);
            column.spacing = 5f;
            Button(panel, "+", () => cameraRig.ZoomIn(), 50f, 50f);
            Button(panel, "Geral", () => cameraRig.ResetView(), 50f, 50f);
            Button(panel, "-", () => cameraRig.ZoomOut(), 50f, 50f);
        }

        private void BuildMessage(Transform parent)
        {
            RectTransform panel = Panel("Message", parent, new Vector2(0.5f, 0f), new Vector2(0.5f, 0f), new Vector2(-300f, 106f), new Vector2(300f, 154f));
            messageText = AddText(panel, string.Empty, 17, FontStyle.Bold, Vector2.zero);
            messageText.alignment = TextAnchor.MiddleCenter;
            messageText.gameObject.SetActive(false);
        }

        private void BuildEditorPanel(Transform parent)
        {
            RectTransform panel = Panel("EditorPanel", parent, new Vector2(0.5f, 1f), new Vector2(0.5f, 1f), new Vector2(-420f, -160f), new Vector2(420f, -94f));
            editorPanel = panel.gameObject;
            HorizontalLayoutGroup row = panel.gameObject.AddComponent<HorizontalLayoutGroup>();
            row.padding = new RectOffset(10, 10, 8, 8);
            row.spacing = 6f;
            row.childAlignment = TextAnchor.MiddleCenter;
            Button(panel, "Mover", () => placement.SetAction(PlacementAction.Move), 100f);
            Button(panel, "Cerca", () => placement.SetAction(PlacementAction.PlaceFence), 100f);
            Button(panel, "Canteiro", () => placement.SetAction(PlacementAction.PlacePlot), 112f);
            Button(panel, "Lago", () => placement.SetAction(PlacementAction.PlacePond), 100f);
            Button(panel, "Machado", () => placement.SetAction(PlacementAction.CutTree), 112f);
            Button(panel, "Fechar", () => placement.SetEditing(false), 100f);
            editorPanel.SetActive(false);
        }

        private void BuildModal(Transform parent)
        {
            modal = new GameObject("Modal", typeof(RectTransform), typeof(Image));
            modal.transform.SetParent(parent, false);
            RectTransform root = modal.GetComponent<RectTransform>();
            root.anchorMin = Vector2.zero;
            root.anchorMax = Vector2.one;
            root.offsetMin = Vector2.zero;
            root.offsetMax = Vector2.zero;
            modal.GetComponent<Image>().color = new Color(0f, 0f, 0f, 0.38f);

            RectTransform window = Panel("Window", modal.transform, new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f), new Vector2(-285f, -260f), new Vector2(285f, 260f));
            VerticalLayoutGroup layout = window.gameObject.AddComponent<VerticalLayoutGroup>();
            layout.padding = new RectOffset(22, 22, 20, 20);
            layout.spacing = 10f;
            layout.childAlignment = TextAnchor.UpperCenter;
            layout.childControlHeight = false;
            layout.childForceExpandWidth = true;
            modalContent = window;
            modal.SetActive(false);
        }

        public void Refresh()
        {
            if (session == null || coinsText == null)
                return;
            coinsText.text = session.Coins.ToString("0.00");
            levelText.text = $"LV {session.Level}";
            storageText.text = $"{session.UsedStorage}/{session.Save.barnCapacity}";
            modeText.text = session.Mode == GameMode.Free ? "Livre" : "Realista";
            editText.text = placement != null && placement.IsEditing ? "Sair da edição" : "Editar mapa";
            if (editorPanel != null) editorPanel.SetActive(placement != null && placement.IsEditing);

            foreach ((FarmTool tool, Button button) in toolButtons)
                SetSelected(button, session.SelectedTool == tool);
            foreach ((CropKind crop, Button button) in cropButtons)
                SetSelected(button, session.SelectedCrop == crop);
        }

        public void ShowMessage(string message, float seconds = 3.2f)
        {
            if (messageText == null)
                return;
            messageText.text = message;
            messageText.gameObject.SetActive(true);
            messageUntil = Time.unscaledTime + seconds;
        }

        public void OpenAnimalPen(AnimalPen pen)
        {
            OpenModal($"{session.Balance.Animal(pen.Kind).displayName}");
            AddModalText($"Quantidade: {pen.AnimalCount}\nCuidado: {pen.Care:0}%\nPróxima produção: {FormatDuration(pen.RemainingSeconds)}");
            AnimalBalance balance = session.Balance.Animal(pen.Kind);
            Button(modalContent, $"Comprar - {balance.purchaseCost:0}", () => { pen.TryBuyAnimal(); OpenAnimalPen(pen); }, 0f, 48f);
            Button(modalContent, "Alimentar", () => { pen.TryFeed(); OpenAnimalPen(pen); }, 0f, 48f);
            Button(modalContent, "Coletar produção", () => { pen.TryCollect(); OpenAnimalPen(pen); }, 0f, 48f);
            AddCloseButton();
        }

        public void OpenHouse()
        {
            OpenModal("Sede da fazenda");
            FarmLevelBalance current = session.Balance.Level(session.Level);
            AddModalText($"Nível {session.Level}\nTeto otimista no modo Realista: {current.realisticMarginCap:P0}");
            if (session.Level < session.Balance.levels.Length)
            {
                FarmLevelBalance next = session.Balance.Level(session.Level + 1);
                Button(modalContent, $"Evoluir sede - {next.upgradeCost:0}", () => { session.TryUpgradeFarm(); OpenHouse(); }, 0f, 50f);
            }
            AddCloseButton();
        }

        public void OpenBarn()
        {
            OpenModal("Galpão");
            AddModalText($"Capacidade: {session.UsedStorage}/{session.Save.barnCapacity}");
            Button(modalContent, "Ampliar +10 - 100 moedas", () =>
            {
                if (session.TrySpend(100f))
                {
                    session.Save.barnCapacity += 10;
                    session.NotifyChanged();
                }
                OpenBarn();
            }, 0f, 50f);
            AddCloseButton();
        }

        private void OpenBuildMenu()
        {
            OpenModal("Construir");
            AddModalText("Escolha uma construção e depois toque em uma área livre já comprada.");
            Button(modalContent, "Novo canteiro", () => StartPlacement(PlacementAction.PlacePlot), 0f, 48f);
            Button(modalContent, "Cerca", () => StartPlacement(PlacementAction.PlaceFence), 0f, 48f);
            Button(modalContent, $"Lago de peixes - {session.Balance.fishPondCost:0}", () => StartPlacement(PlacementAction.PlacePond), 0f, 48f);
            AddCloseButton();
        }

        private void OpenTeamMenu()
        {
            OpenModal("Equipe da fazenda");
            foreach (EmployeeKind kind in Enum.GetValues(typeof(EmployeeKind)))
            {
                EmployeeBalance data = session.Balance.Employee(kind);
                bool hired = employees.IsHired(kind);
                string label = hired ? $"Demitir {data.displayName}" : $"Contratar {data.displayName} - {data.hireCost:0}";
                Button(modalContent, label, () =>
                {
                    if (employees.IsHired(kind)) employees.Dismiss(kind); else employees.Hire(kind);
                    OpenTeamMenu();
                }, 0f, 48f);
            }
            AddCloseButton();
        }

        private void OpenMainMenu()
        {
            OpenModal("AgroFarm");
            AddModalText("Projeto Unity 6 URP mobile-first. Clique ou toque no chão para andar; toque nos elementos para interagir.");
            Button(modalContent, "Alternar modo Livre/Realista", ToggleMode, 0f, 48f);
            Button(modalContent, "Visão geral", () => { cameraRig.ResetView(); CloseModal(); }, 0f, 48f);
            Button(modalContent, "Salvar agora", () => { session.SaveNow(); ShowMessage("Jogo salvo."); }, 0f, 48f);
            AddCloseButton();
        }

        private void ToggleMode()
        {
            session.ToggleMode();
            Refresh();
        }

        private void ToggleEditor()
        {
            placement.SetEditing(!placement.IsEditing);
            Refresh();
        }

        private void StartPlacement(PlacementAction action)
        {
            CloseModal();
            placement.SetAction(action);
        }

        private void OpenModal(string title)
        {
            ClearModal();
            Text heading = AddText(modalContent, title, 24, FontStyle.Bold, new Vector2(0f, 42f));
            heading.alignment = TextAnchor.MiddleCenter;
            modal.SetActive(true);
        }

        private void ClearModal()
        {
            for (int index = modalContent.childCount - 1; index >= 0; index--)
                Destroy(modalContent.GetChild(index).gameObject);
        }

        private void AddModalText(string value)
        {
            Text text = AddText(modalContent, value, 17, FontStyle.Normal, new Vector2(0f, 80f));
            text.alignment = TextAnchor.MiddleCenter;
        }

        private void AddCloseButton() => Button(modalContent, "Fechar", CloseModal, 0f, 48f);
        private void CloseModal() => modal.SetActive(false);

        private RectTransform Panel(string name, Transform parent, Vector2 anchorMin, Vector2 anchorMax, Vector2 offsetMin, Vector2 offsetMax)
        {
            GameObject panelObject = new(name, typeof(RectTransform), typeof(Image));
            panelObject.transform.SetParent(parent, false);
            RectTransform rect = panelObject.GetComponent<RectTransform>();
            rect.anchorMin = anchorMin;
            rect.anchorMax = anchorMax;
            rect.offsetMin = offsetMin;
            rect.offsetMax = offsetMax;
            panelObject.GetComponent<Image>().color = PanelColor;
            return rect;
        }

        private Text Chip(Transform parent, string value, float width)
        {
            Button button = Button(parent, value, null, width, 44f);
            button.interactable = false;
            return button.GetComponentInChildren<Text>();
        }

        private Button Button(Transform parent, string label, Action action, float width, float height = 44f)
        {
            GameObject buttonObject = new($"Button_{label}", typeof(RectTransform), typeof(Image), typeof(Button), typeof(LayoutElement));
            buttonObject.transform.SetParent(parent, false);
            LayoutElement layout = buttonObject.GetComponent<LayoutElement>();
            layout.preferredWidth = width > 0f ? width : 500f;
            layout.preferredHeight = height;
            layout.flexibleWidth = width > 0f ? 0f : 1f;
            Image image = buttonObject.GetComponent<Image>();
            image.color = new Color(0.95f, 0.92f, 0.78f, 1f);
            Button button = buttonObject.GetComponent<Button>();
            button.targetGraphic = image;
            if (action != null) button.onClick.AddListener(() => action());
            Text text = AddText(buttonObject.transform, label, 16, FontStyle.Bold, Vector2.zero);
            RectTransform textRect = text.rectTransform;
            textRect.anchorMin = Vector2.zero;
            textRect.anchorMax = Vector2.one;
            textRect.offsetMin = new Vector2(5f, 2f);
            textRect.offsetMax = new Vector2(-5f, -2f);
            text.alignment = TextAnchor.MiddleCenter;
            return button;
        }

        private Text AddText(Transform parent, string value, int size, FontStyle style, Vector2 preferredSize)
        {
            GameObject textObject = new("Text", typeof(RectTransform), typeof(Text), typeof(LayoutElement));
            textObject.transform.SetParent(parent, false);
            Text text = textObject.GetComponent<Text>();
            text.text = value;
            text.font = font;
            text.fontSize = size;
            text.fontStyle = style;
            text.color = DarkText;
            text.alignment = TextAnchor.MiddleLeft;
            text.horizontalOverflow = HorizontalWrapMode.Wrap;
            text.verticalOverflow = VerticalWrapMode.Overflow;
            LayoutElement layout = textObject.GetComponent<LayoutElement>();
            if (preferredSize.x > 0f) layout.preferredWidth = preferredSize.x;
            if (preferredSize.y > 0f) layout.preferredHeight = preferredSize.y;
            return text;
        }

        private static void SetSelected(Button button, bool selected)
        {
            if (button != null && button.targetGraphic is Image image)
                image.color = selected ? AccentColor : new Color(0.95f, 0.92f, 0.78f, 1f);
        }

        private static string FormatDuration(double seconds)
        {
            int total = Mathf.CeilToInt((float)Math.Max(0d, seconds));
            if (total <= 0) return "Pronto";
            if (total < 60) return $"{total}s";
            if (total < 3600) return $"{total / 60}:{total % 60:00}";
            return $"{total / 3600}h {(total / 60) % 60:00}m";
        }
    }
}
