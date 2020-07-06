import sys
import os

# packages for neural networks with PyTorch
import torch

# load and display images
import matplotlib.pyplot as plt

import torchvision.transforms as transforms  # trans PIL imgs into tensors
import torchvision.models as models  # train/load pre-trained models

# classes from local files
from Model import StyleModel
from ImageHandler import ImageHandler as img_handler


if __name__ == "__main__":
    args = (sys.argv)[1:]  # Get env arguments
    run_saves = '--runs' in args  # Save all steps into folder
    plt_prvs = '--preview' in args  # Use PLT to show previews during execution

    # running on a gpu would provide better performance/results, but a cpu will
    # work if that's all we have accessible
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    # --- LOADING THE IMAGES ----
    # desired size of the output image
    imsize = int(input("Image Size: "))

    loader = transforms.Compose([
        transforms.Resize(imsize),  # scale imported image on shortest length
        transforms.ToTensor()])  # transform it into a torch tensor

    # Verify image path
    style_path = input("Path to Style: ")
    while not os.path.isfile(style_path):
        style_path = input('E: Image not found. Path to Style: ')

    # Verify content path
    content_path = input("Path to Content: ")
    while not os.path.isfile(content_path):
        content_path = input('E: Image not found. Path to Content: ')

    style_img = img_handler.image_loader(device, loader, style_path)
    content_img = img_handler.image_loader(device, loader, content_path)

    # TODO remove once image size class is implemented
    assert style_img.size() == content_img.size(), \
        "we need to import style and content imsages of the same size"

    unloader = transforms.ToPILImage()  # reconvert into PIL image

    if plt_prvs:
        plt.ion()
        plt.figure()
        img_handler.imshow(style_img, unloader, title='Style Image')

        plt.figure()
        img_handler.imshow(content_img, unloader, title='Content Image')

    # --- IMPORTING THE MODEL ---
    cnn = models.vgg19(pretrained=True).features.to(device).eval()

    cnn_normalization_mean = torch.tensor([0.485, 0.456, 0.406]).to(device)
    cnn_normalization_std = torch.tensor([0.229, 0.224, 0.225]).to(device)

    # desired depth layers to compute style/content losses :
    content_layers_default = ['conv_4']
    style_layers_default = ['conv_1', 'conv_2', 'conv_3', 'conv_4', 'conv_5']

    input_path = input("Input Image Path or 'noise': ")

    if input_path == "noise":
        input_img = torch.randn(content_img.data.size(), device=device)
    else:
        while not os.path.isfile(input_path):
            input_path = input('E: Image not found. Path to input image: ')
        input_img = img_handler.image_loader(input_path)

    # add the original input image to the figure:
    plt.figure()
    img_handler.imshow(input_img, unloader, title='Input Image')

    num_steps = int(input("Number of Steps: "))
    out_img = input('Save output as: ')
    output_path = os.path.join(os.getcwd(), 'output', out_img)

    # --- RUNNING THE ALGORITHM ---
    style_model = StyleModel(device, cnn, cnn_normalization_mean, cnn_normalization_std,
                             style_img, content_img, style_layers=style_layers_default, content_layers=content_layers_default)
    output = style_model.run_style_transfer(input_img=input_img, unloader=unloader, prev=plt_prvs)

    # --- SHOW AND SAVE OUTPUT ---
    if plt_prvs:
        img_handler.imshow(output, unloader, title='Output Image')
        plt.ioff()
        plt.show()

    img_handler.imsave(output_path, unloader, output)
    input("Press enter to continue...")
