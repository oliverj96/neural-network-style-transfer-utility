# packages for neural networks with PyTorch
import torch

# load and display images
from PIL import Image
import matplotlib.pyplot as plt


class ImageHandler:
    def image_loader(device, loader, image_name):
        image = Image.open(image_name)
        # fake batch dimension required to fit network's input dimensions
        image = loader(image).unsqueeze(0)
        return image.to(device, torch.float)

    def imshow(tensor, unloader, title=None):
        image = tensor.cpu().clone()  # we clone the tensor to not do changes
        image = image.squeeze(0)  # remove the fake batch dimension
        image = unloader(image)
        plt.imshow(image)
        if title is not None:
            plt.title(title)
        plt.pause(0.001)  # pause a bit so that plots are updated

    def imsave(path, unloader, tensor):
        image = tensor.cpu().clone()
        image = image.squeeze(0)
        image = unloader(image)
        image.save(path)
