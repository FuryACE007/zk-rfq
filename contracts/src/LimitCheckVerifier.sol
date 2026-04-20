// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.21;

import "./HonkBase.sol";

uint256 constant LC_N = 4096;
uint256 constant LC_LOG_N = 12;
uint256 constant LC_NUMBER_OF_PUBLIC_INPUTS = 9;
uint256 constant LC_VK_HASH = 0x2ce8d4627bdde6d6afaaf70c759a49bcfcd7d108cc2af183100fa854b1b87649;

library LimitCheckHonkVK {
    function loadVerificationKey() internal pure returns (Honk.VerificationKey memory) {
        Honk.VerificationKey memory vk = Honk.VerificationKey({
            circuitSize: uint256(4096),
            logCircuitSize: uint256(12),
            publicInputsSize: uint256(9),
            ql: Honk.G1Point({ 
               x: uint256(0x2a755b6ad869c50910ab1327a9e8b72da26abb1dc0ca3c97c265285a8d038911),
               y: uint256(0x0160131cd2e56e47414874964f9a22d44ef4a40892eb563e450ab0a70fe0808b)
            }),
            qr: Honk.G1Point({ 
               x: uint256(0x24ffb8480185b5876052b033c7885cfa226485653a57f801d9fe29b1818b6a3e),
               y: uint256(0x1c5d975595d919cc039a47f84c3bb67fc74ea2424a262156af02be146751885a)
            }),
            qo: Honk.G1Point({ 
               x: uint256(0x1a67fa968188bfe675393df5033e5322cc4585ff5f46e5025d9f577582dcb329),
               y: uint256(0x223c5bfcdac7e1ef3df1bd6dc5480769bf4d45b579e40aafecbb628c911b522f)
            }),
            q4: Honk.G1Point({ 
               x: uint256(0x15f928cbc286d43e6efd7a674eb1b4b8a5c9880ed34612b9f419184e4cec000d),
               y: uint256(0x1de64a423e3a12bf6220e89f6ff21bbb55f9d5b56a6bcb384bee802570a4db89)
            }),
            qm: Honk.G1Point({ 
               x: uint256(0x0d413e9604ac657a4058b66c9f5c29e49704c1c06ca9c67ad2061979110beea3),
               y: uint256(0x3053f1d1b7bdde0da1669c001feab5caf2c51135471b633077754eeb2e86e2c4)
            }),
            qc: Honk.G1Point({ 
               x: uint256(0x2bec4a22ebc2f34168907af3a603472a44cec47c6fa617cb400f5531fee47d22),
               y: uint256(0x300593b66210fdbd724f7cafaf0e336dc09a4f7972ce85bf96cbe83556b909ca)
            }),
            qLookup: Honk.G1Point({ 
               x: uint256(0x22011c91613251ef53fd12a397e4bd6165b1ed309dcd94b33ac4226d34b68889),
               y: uint256(0x1fb02875a3542a3a6f4426ad912b70cf32b444a8e439701da6e8e7b30029cfc7)
            }),
            qArith: Honk.G1Point({ 
               x: uint256(0x07a3b1e45e148c6eca3124e2679c4443467c7f804279523e4b111b3142fb6380),
               y: uint256(0x0482b668aeaae0849bb5f25d8664fcaeacbddb870a4125845c5d9e442749c0a2)
            }),
            qDeltaRange: Honk.G1Point({ 
               x: uint256(0x0357d87732b77388c4e109bb6c584d7dab59f27db209aa9d5aa66d77d8405d46),
               y: uint256(0x20fba6557fb8af8e7e062e3bb8d145119a6847a796f7fee2dfea9d7eaa38ada0)
            }),
            qElliptic: Honk.G1Point({ 
               x: uint256(0x2280e15468a5b0c8d919598c9d152e9f87f712aef2dacec2a69fb79222c6732d),
               y: uint256(0x15cb0c286c3e5dde616fb647532f485a5583ed7f256f93306700ef1a28481d7d)
            }),
            qMemory: Honk.G1Point({ 
               x: uint256(0x292204025d2d436f94aef8f6277e4e5274ce6f8a4b2f9410f92fd351d14e12bf),
               y: uint256(0x144eaaf454bea01c49c6de6ab724a48015a74064dd5302a09bed75b2cbf73ab2)
            }),
            qNnf: Honk.G1Point({ 
               x: uint256(0x019ced0fb5a9c2fb9059ebf7a00623679be0fe6ed0c501c562146b0bcf4561d2),
               y: uint256(0x0887f2a450fc92280cb64686d0a4a9dc15841f2070aaa8c05417e9db38192bcd)
            }),
            qPoseidon2External: Honk.G1Point({ 
               x: uint256(0x0595fe0d1783722f8d5cecbf0eb9fdad90347df625e63c03157948d611998d1f),
               y: uint256(0x14a053911aa1cb7114586f6397c97f267014be7498a5c78944eb9add0d9fbbe4)
            }),
            qPoseidon2Internal: Honk.G1Point({ 
               x: uint256(0x0af755b62c6eed4f886dd3979de98e0982b368e3ee73a9e1e3498385a2866238),
               y: uint256(0x2463dddad45467e537b0ea022abca8a85bf381e42047c294d541e96ad413986e)
            }),
            s1: Honk.G1Point({ 
               x: uint256(0x1ed3e7afb82d7f3c83a7318cf84d9e52773b491996c0d67271815552ec0dcde9),
               y: uint256(0x2efc8e5d30024d4ae075f777832dde74012205ea892b1612e79ff6d9db577f05)
            }),
            s2: Honk.G1Point({ 
               x: uint256(0x249c780951e712832b0bb1ad15188b21fa0f12cd7e02220c654a8d35ba8272a0),
               y: uint256(0x12091ec2393324fbfab1f9da67514aa0f4be29d24c57dbcac458394f3b7b0aff)
            }),
            s3: Honk.G1Point({ 
               x: uint256(0x04d572b1157c77910dec946a60aa93f0f0198a31badabbaee633ac5e85edc3fd),
               y: uint256(0x232ef99047f992e68471888601138f261d1d55f77b3f5c3a93d9e823e63e3fd1)
            }),
            s4: Honk.G1Point({ 
               x: uint256(0x1211c49067c92255ce4b82e38fbddbbf8e56b744cc5aa82d9eabbaa5a790b1a9),
               y: uint256(0x197680d31144f514544e475f853048af530fae67c224e60f90a443aa24c8bd34)
            }),
            t1: Honk.G1Point({ 
               x: uint256(0x099e3bd5a0a00ab7fe18040105b9b395b5d8b7b4a63b05df652b0d10ef146d26),
               y: uint256(0x0015b8d2515d76e2ccec99dcd194592129af3a637f5a622a32440f860d1e2a7f)
            }),
            t2: Honk.G1Point({ 
               x: uint256(0x1b917517920bad3d8bc01c9595092a222b888108dc25d1aa450e0b4bc212c37e),
               y: uint256(0x305e8992b148eedb22e6e992077a84482141c7ebe42000a1d58ccb74381f6d19)
            }),
            t3: Honk.G1Point({ 
               x: uint256(0x16465a5ccbb550cd2c63bd58116fe47c86847618681dc29d8a9363ab7c40e1c3),
               y: uint256(0x2e24d420fbf9508ed31de692db477b439973ac12d7ca796d6fe98ca40e6ca6b7)
            }),
            t4: Honk.G1Point({ 
               x: uint256(0x043d063b130adfb37342af45d0155a28edd1a7e46c840d9c943fdf45521c64ce),
               y: uint256(0x261522c4089330646aff96736194949330952ae74c573d1686d9cb4a00733854)
            }),
            id1: Honk.G1Point({ 
               x: uint256(0x1b72aa3ece34e805f37d0471d679bd66e02379dac699d08f0bcbff009c552696),
               y: uint256(0x1e263705eb87b01fb7ce299cf0c292c6c50c3157a03e2cb1fe8eb7c6f037ec44)
            }),
            id2: Honk.G1Point({ 
               x: uint256(0x1b379ddb24cbabe1460a475be813006f0ce7a7fec79c151a55a1e7cce2685c41),
               y: uint256(0x1374681102efa2f80050bba9d652ff1297b8a8ebba032582b9972576cc01efe0)
            }),
            id3: Honk.G1Point({ 
               x: uint256(0x1eb3d4f94f2e52ebf48477db68267234185619db44cedadb42f157067e4b219d),
               y: uint256(0x13ad230432b629d3dce9077b284339478d85510b3d9e9ac7cd2fe1233fa792b9)
            }),
            id4: Honk.G1Point({ 
               x: uint256(0x2abf8f4397004c9bc5f9571602f2649682888cf72e1e9355e60d33f17fcbe7ed),
               y: uint256(0x1c6100bc5d1028d03a7db49c21b0a647e2fcbaf8d340e24825315af0ca5e2a89)
            }),
            lagrangeFirst: Honk.G1Point({ 
               x: uint256(0x0000000000000000000000000000000000000000000000000000000000000001),
               y: uint256(0x0000000000000000000000000000000000000000000000000000000000000002)
            }),
            lagrangeLast: Honk.G1Point({ 
               x: uint256(0x05352a347c695e637dea164ac3f8b58b6acda40fbd995c3ab4f893851740cb17),
               y: uint256(0x01deb0013724cc0f5ee326404f37e485eb512b5c5fbf2faa241af278b6438590)
            })
        });
        return vk;
    }
}

contract LimitCheckVerifier is BaseZKHonkVerifier(LC_N, LC_LOG_N, LC_VK_HASH, LC_NUMBER_OF_PUBLIC_INPUTS) {
    function loadVerificationKey() internal pure override returns (Honk.VerificationKey memory) {
        return LimitCheckHonkVK.loadVerificationKey();
    }
}
